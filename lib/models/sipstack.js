module.exports = require('webrtc-core').bdsft.Model(SIPStack, {
  config: require('../../js/config')
});

var ExSIP = require('exsip');
var Constants = require('webrtc-core').constants;
var Utils = require('webrtc-core').utils;

function SIPStack(eventbus, debug, urlconfig, cookieconfig) {
  var self = {};

  self.ua = null;
  self.activeSession = null;
  self.sessions = [];

  self.updateUaConfig = function(){
    self.ua && self.ua.loadConfig(self.getExSIPConfig());
  };

  self.updateRtcMediaHandlerOptions = function() {
    self.ua && self.ua.setRtcMediaHandlerOptions(self.getRtcMediaHandlerOptions());
  };

  self.updateMediaConstraints = function() {
    self.mediaConstraints = {
        audio: true,
        video: getVideoConstraints()
      };
  };

  self.updateUserMedia = function(value, name, userMediaCallback, failureCallback) {
    if (!self.ua) {
      return;
    }

    self.userMediaFailed = false;
    if (self.enabled && (self.enableConnectLocalMedia || self.activeSession)) {
      // Connect to local stream
      var options = self.getExSIPOptions();
      self.ua.getUserMedia(options, function(localStream) {
        eventbus.userMediaUpdated(localStream);
        if (self.activeSession) {
          debug.log("changing active session ...");
          self.activeSession.changeSession({
            localMedia: localStream,
            createOfferConstraints: options.createOfferConstraints
          }, function() {
            debug.log('change session succeeded');
          }, function() {
            debug.log('change session failed');
          });
        }

        if (userMediaCallback) {
          userMediaCallback(localStream);
        }
      }, function(e) {
        self.userMediaFailed = true;
        if (failureCallback) {
          failureCallback(e);
        }
      }, true);
    }
  };

  self.updateBandwidth = function(value, name){
    value = parseInt(value, 10);
    self[name] = value;
  };

  self.bindings = {
    mediaConstraints: {
      sipstack: ['audioOnly', 'encodingResolution', 'hd']
    },
    uaConfig: {
      sipstack: ['networkUserId', 'enableIms', 'domainFrom', 'debug', 'enableDatachannel', 'pAssertedIdentity', 'mediaConstraints'],
      cookieconfig: ['userid', 'authenticationUserid', 'password', 'displayName']
    },
    rtcMediaHandlerOptions: {
      sipstack: ['bandwidthLow', 'bandwidthMed', 'bandwidthHigh', 'encodingResolution']
    },
    userMedia: {
      sipstack: ['audioOnly', 'encodingResolution', 'enableConnectLocalMedia', 'offerToReceiveVideo']
    },
    bandwidth: {
      cookieconfig: ['bandwidthLow', 'bandwidthMed', 'bandwidthHigh']
    },
    hd: {
      cookieconfig: 'hd',
      urlconfig: 'hd'
    },
    encodingResolution: {
      cookieconfig: 'encodingResolution'
    },
    enableAutoAnswer: {
      cookieconfig: 'enableAutoAnswer',
      urlconfig: 'enableAutoAnswer'
    },
    networkUserId: {
      urlconfig: 'networkUserId'
    },
    enableIms: {
      urlconfig: 'enableIms'
    },
    enableConnectLocalMedia: {
      urlconfig: 'enableConnectLocalMedia'
    },
    audioOnly: {
      urlconfig: ['audioOnly', 'audioOnlyView']
    }
  };

  self.props = ['callState', 'registered', 'hd', 'connected', 'registrationStatus', 'connecting', 'registering', 'unregistering', 'failed', 'failedCause',
  'userMediaFailed', 'mediaConstraints'];

  var checkEndCallURL = function() {
    if (self.endCallURL && self.enabled) {
      window.location = self.endCallURL;
    }
  };

  var getBandwidth = function() {
    var height = self.encodingResolutionHeight();
    if (height <= 240) {
      return self.bandwidthLow;
    } else if (height <= 480) {
      return self.bandwidthMed;
    } else if (height <= 1080) {
      return self.bandwidthHigh;
    } else {
      debug.log('getBandwidth : no encoding height matches : ', height);
    }
  };

  var getResolutionConstraints = function() {
    var width = self.encodingResolutionWidth();
    var height = self.encodingResolutionHeight();
    if (width && height) {
      if (height <= 480) {
        return {
          mandatory: {
            maxWidth: width,
            maxHeight: height
          }
        };
      } else {
        return {
          mandatory: {
            minWidth: width,
            minHeight: height
          }
        };
      }
    } else {
      return false;
    }
  };

  var getVideoConstraints = function() {
    if (self.audioOnly) {
      return false;
    } else {
      var constraints = getResolutionConstraints();
      return constraints ? constraints : true;
    }
  };

  var setActiveSession = function(session) {
    debug.log("setting active session to " + session.id);
    self.activeSession = session;
  };

  var updateCallState = function() {
    if (self.sessions.length > 0) {
      if (self.sessions.length === 1 && !self.sessions[0].isStarted()) {
        self.callState = Constants.STATE_CALLING;
      } else {
        if (self.activeSession && self.activeSession.isHeld()) {
          self.callState = [Constants.STATE_STARTED, Constants.STATE_HELD];
        } else {
          self.callState = Constants.STATE_STARTED;
        }
      }
    } else {
      if (self.ua && self.ua.isConnected && self.ua.isConnected()) {
        self.callState = Constants.STATE_CONNECTED;
      } else {
        self.callState = Constants.STATE_DISCONNECTED;
      }
    }
  };

  self.endCall = function(options) {
    options = options || {};
    var rtcSession = options.rtcSession;
    if (rtcSession === 'all') {
      self.terminateSessions();
    } else if (rtcSession) {
      self.terminateSession(rtcSession);
    } else {
      self.terminateSession();
    }
    // stop localMedia to turn off light
    if(!self.enableConnectLocalMedia && self.ua && self.ua.localMedia) {
      self.ua.localMedia.stop();
    }
  };
  self.getLocalStreams = function() {
    return self.activeSession ? self.activeSession.getLocalStreams() : null;
  };
  self.getRemoteStreams = function() {
    return self.activeSession ? self.activeSession.getRemoteStreams() : null;
  };
  self.getSessionId = function() {
    return self.activeSession.id.replace(/\./g, '');
  };
  self.terminateSession = function(session) {
    session = session || self.activeSession;
    if (!session) {
      return;
    }
    var index = self.sessions.indexOf(session);
    if (index !== -1) {
      self.sessions.splice(index, index + 1);
    }
    if (session.status !== ExSIP.RTCSession.C.STATUS_TERMINATED) {
      session.terminate();
    }
    if (session === self.activeSession) {
      debug.log("clearing active session");
      self.activeSession = null;
    }
    updateCallState();
  };
  self.terminateSessions = function() {
    var allSessions = [];
    allSessions = allSessions.concat(self.sessions);
    for (var i = 0; i < allSessions.length; i++) {
      self.terminateSession(allSessions[i]);
    }
  };
  self.holdAndAccept = function(session) {
    var firstSession = self.activeSession;
    session.on('ended', function() {
      // eventbus.emit('message', {
      //   text: 'Resuming with ' + firstSession.remote_identity.uri.user,
      //   level: 'normal'
      // });
      debug.info("incoming call ended - unholding first call");
      firstSession.unhold(function() {
        debug.info("unhold first call successful");
      });
    });
    self.activeSession.hold(function() {
      debug.info("hold successful - answering incoming call");
      self.answer(session);
    });
  };
  self.answer = function(session) {
    session.answer(self.getExSIPOptions());
  };
  self.hold = function(successCallback, failureCallback) {
    if (self.activeSession) {
      self.activeSession.hold(function() {
        successCallback && successCallback();
      }, function(e) {
        failureCallback && failureCallback();
      });
    }
  };
  self.unhold = function(successCallback, failureCallback) {
    if (self.activeSession) {
      self.activeSession.unhold(function() {
        successCallback && successCallback();
      }, function(e) {
        failureCallback && failureCallback();
      });
    }
  };
  self.reconnectUserMedia = function(successCallback, failureCallback) {
    var onUserMediaUpdateSuccess = function(localMedia) {
      debug.log("reconnect user media successful");
      if (self.activeSession) {
        self.activeSession.changeSession({
          localMedia: localMedia
        }, function() {
          debug.log("session changed successfully");
          if (successCallback) {
            successCallback(localMedia);
          }
        }, failureCallback);
      } else if (successCallback) {
        successCallback(localMedia);
      }
    };
    self.updateUserMedia(null, null, onUserMediaUpdateSuccess, failureCallback);
  };
  self.call = function(destination) {
    var session = self.ua.call(destination, self.getExSIPOptions());
    eventbus.calling(destination, session);
  };
  self.sendDTMF = function(digit) {
    self.activeSession.sendDTMF(digit, self.getDTMFOptions());
  };
  self.isStarted = function() {
    return self.getCallState() === Constants.STATE_STARTED;
  };
  self.unregister = function() {
    self.unregistering = true;
    self.ua && self.ua.unregister();
    // eventbus.once('unregistered', function() {
    //   updateUA();
    // });
  };
  self.register = function() {
    self.registering = true;
    self.ua && self.ua.register();
    // updateUA(data);
  };
  self.sendData = function(data) {
    if (self.activeSession) {
      self.activeSession.sendData(data);
    }
  };
  self.transfer = function(transferTarget, isAttended) {
    if (isAttended) {
      self.ua.attendedTransfer(transferTarget, self.activeSession);
    } else {
      self.ua.transfer(transferTarget, self.activeSession);
    }
  };
  self.getCallState = function() {
    return self.callState;
  }

  // Incoming reinvite function
  self.incomingReInvite = function(e) {
    debug.log("auto accepting reInvite");
    e.data.session.acceptReInvite();
  };

  self.getExSIPOptions = function() {
    // Options Passed to ExSIP
    var options = {
      mediaConstraints: self.mediaConstraints,
      createOfferConstraints: {
        mandatory: {
          OfferToReceiveAudio: true,
          OfferToReceiveVideo: self.offerToReceiveVideo
        }
      }
    };
    return options;
  };

  self.setAudioOnlyOfferAndRec = function(audioOnly) { 
    self.audioOnly = audioOnly;
    offerToReceiveVideo = !audioOnly;
    self.updateUserMedia();
  };

  self.setAudioOnly = function(audioOnly) { 
    self.audioOnly = audioOnly;
    offerToReceiveVideo = true;
    self.updateUserMedia();
  };

  self.encodingResolutionWidth = function() {
    return Utils.resolutionWidth(self.hd && Constants.R_1280x720 || self.encodingResolution);
  };

  self.encodingResolutionHeight = function() {
    return Utils.resolutionHeight(self.hd && Constants.R_1280x720 || self.encodingResolution);
  };

  self.getExSIPConfig = function(data) {
    data = data || {};
    var userid = data.userId || cookieconfig.userid || self.networkUserId || Utils.randomUserid();

    var sip_uri = encodeURI(userid);
    if ((sip_uri.indexOf("@") === -1)) {
      sip_uri = (sip_uri + "@" + self.domainFrom);
    }

    var config = {
      'uri': sip_uri,
      'authorization_user': data.authenticationUserId || cookieconfig.authenticationUserid || userid,
      'password': data.password || cookieconfig.password,
      'ws_servers': self.websocketsServers,
      'stun_servers': 'stun:' + self.stunServer + ':' + self.stunPort,
      'trace_sip': self.debug,
      'enable_ims': self.enableIms,
      'enable_datachannel': self.enableDatachannel
    };

    // Add Display Name if set
    if (cookieconfig.displayName) {
      config.display_name = cookieconfig.displayName;
    }

    // do registration if User ID or register is set
    var register = data.authenticationUserId || cookieconfig.authenticationUserid || data.userId || cookieconfig.userid;
    if (register) {
      config.register = true;
    } else {
       // only set PAI if user is not registered
      config.p_asserted_identity = self.pAssertedIdentity;
      config.register = false;
    }
    return config;
  };

  self.getRtcMediaHandlerOptions = function() {
    var options = {
      reuseLocalMedia: self.enableConnectLocalMedia,
      videoBandwidth: getBandwidth(),
      disableICE: self.disableICE,
      RTCConstraints: {
        'optional': [],
        'mandatory': {}
      }
    };
    return options;
  };

  self.getDTMFOptions = function() {
    return {
      duration: Constants.DEFAULT_DURATION,
      interToneGap: Constants.DEFAULT_INTER_TONE_GAP
    };
  };

  self.createUA = function(config) {
    return new ExSIP.UA(config);
  };

  self.listeners = function(databinder) {
    databinder.onModelPropChange(['websocketsServers'], function(){
      self.ua && updateUA();
    });
    window.onbeforeunload = function(e) {
      self.endCall({
        rtcSession: 'all'
      });
      return null;
    };
    eventbus.on(["disconnected", "endCall", "ended"], function(e) {
      checkEndCallURL();
    });
    eventbus.on(["ended", "endCall"], function(e) {
      self.endCall({
        rtcSession: e.sender
      });
    });
    eventbus.on("resumed", function(e) {
      setActiveSession(e.sender);
    });
    eventbus.on("started", function(e) {
      setActiveSession(e.sender);
    });
    var dtmfTones = Utils.parseDTMFTones(urlconfig.destination);
    if(dtmfTones) {
      eventbus.once("started", function(e) {
        debug.info("DTMF tones found in destination - sending DTMF tones : " + dtmfTones);
        self.sendDTMF(dtmfTones);
      });
    }
  };

  self.init = function() {
    if(urlconfig.audioOnlyView) {
      self.offerToReceiveVideo = false;
    }

    updateUA();
  };

  var updateUA = function() {
    try {
      if (self.callState && (self.callState !== Constants.STATE_CONNECTED && self.callState !== Constants.STATE_DISCONNECTED)) {
        debug.warn('not able to restart UA - call state is ' + self.callState);
        return;
      }

      if (self.ua) {
        debug.log('stopping existing UA');
        self.ua.stop();
      }

      if (!self.enabled) {
        debug.warn('sipstack disabled');
        return;
      }
      self.connecting = true;
      var config = self.getExSIPConfig();
      self.registering = config.register;
      self.ua = self.createUA(config);

      self.updateRtcMediaHandlerOptions();

      // Start SIP Stack
      self.ua.start();

      // sipStack callbacks
      self.ua.on('connected', function(e) {
        self.connecting = false;
        updateCallState();
        self.connected = true;
        self.updateUserMedia();
      });
      self.ua.on('disconnected', function(e) {
        self.connecting = false;
        updateCallState();
        self.connected = false;
        self.endCall({
          rtcSession: 'all'
        });
      });
      self.ua.on('onReInvite', function(e) {
        debug.log("incoming onReInvite event");
        self.incomingReInvite(e);
      });
      self.ua.on('newRTCSession', function(e) {
        self.failed = undefined;
        self.failedCause = undefined;

        var session = e.data.session;
        self.sessions.push(session);
        updateCallState();

        // call event handlers
        session.on('progress', function(e) {
          eventbus.progress(e);
        });
        session.on('failed', function(e) {
          var data = e.data;
          data.sender = e.sender;
          self.failed = true;
          self.failedCause = data.cause;
          self.endCall({
            rtcSession: e.sender
          });
        });
        session.on('started', function(e) {
          updateCallState();
          eventbus.started(e);
        });
        session.on('resumed', function(e) {
          updateCallState();
          eventbus.resumed(e);
        });
        session.on('held', function(e) {
          updateCallState();
          eventbus.held(e);
        });
        session.on('ended', function(e) {
          updateCallState();
          eventbus.ended(e);
        });
        session.on('newDTMF', function(e) {
          eventbus.newDTMF(e);
        });
        session.on('dataSent', function(e) {
          eventbus.dataSent(e);
        });
        session.on('dataReceived', function(e) {
          eventbus.dataReceived(e);
        });
        session.on('iceconnected', function(e) {
          eventbus.iceconnected(e.sender, e.data);
        });
        session.on('icecompleted', function(e) {
          eventbus.icecompleted(e.sender, e.data);
        });
        session.on('iceclosed', function(e) {
          eventbus.iceclosed(e.sender, e.data);
        });

        // handle incoming call
        if (e.data.session.direction === "incoming") {
          if (!self.activeSession && self.enableAutoAnswer) {
            session.answer(self.getExSIPOptions());
            return;
          } else {
            eventbus.incomingCall(e);
          }
        }

        if (!self.activeSession) {
          setActiveSession(session);
        }
      });

      self.ua.on('registered', function() {
        self.registering = false;
        self.registered = true;
        self.registrationStatus = undefined;
      });
      self.ua.on('unregistered', function() {
        self.unregistering = false;
        self.registered = false;
        self.registrationStatus = undefined;
      });
      self.ua.on('registrationFailed', function(e) {
        self.unregistering = false;
        self.registering = false;
        self.registered = false;
        self.registrationStatus = e.data && e.data.response && e.data.response.status_code+"";
      });
    } catch (e) {
      console.error(e.stack);
      debug.error('could not init sip stack');
    }
  };

  return self;
}
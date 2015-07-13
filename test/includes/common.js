module.exports = function(test) {
    test.emitReInvite = function() {
      sipstack.ua.emit("onReInvite", sipstack.ua, {
        session: {
          acceptReInvite: function() {
            reInviteAccepted = true;
          },
          rejectReInvite: function() {
            reInviteRejected = true;
          }
        },
        request: {
          from: {
            displayName: "test",
            uri: {
              user: "user"
            }
          }
        },
        audioAdd: true,
        videoAdd: true
      });
    };

    test.connectAndStartCall = function() {
      this.connect();
      this.startCall();
    };

    test.connect = function() {
      sipstack.ua.isConnected = function() {
        return true;
      };
      sipstack.ua.emit('connected', sipstack.ua);
    };

    test.disconnect = function(data) {
      sipstack.ua.isConnected = function() {
        return false;
      };
      sipstack.ua.emit('disconnected', sipstack.ua, data);
    };

    test.registrationFailed = function(statusCode) {
      sipstack.ua.emit('registrationFailed', sipstack.ua, {
        response: {
          status_code: (statusCode || 401)
        }
      });
    };

    test.registered = function() {
      sipstack.ua.emit('registered', sipstack.ua, {
        response: {
          status_code: 200
        }
      });
    };

    test.unregistered = function() {
      sipstack.ua.emit('unregistered', sipstack.ua, {
        response: {
          status_code: 200
        }
      });
    };

    test.endCall = function() {
      var ExSIP = require('exsip');
      if (sipstack.activeSession) {
        sipstack.activeSession.status = ExSIP.RTCSession.C.STATUS_TERMINATED;
        sipstack.activeSession.emit('ended', sipstack.activeSession);
      }
    };

    test.startCall = function(session) {
      session = session || this.outgoingSession();
      sipstack.ua.emit('newRTCSession', sipstack.ua, {
        session: session
      });
      session.started('local');
      return session;
    };

    test.reconnectCall = function(session) {
      session = session || this.outgoingSession();
      session.started('local', undefined, true);
    };

    test.newCall = function(session) {
      session = session || this.outgoingSession();
      sipstack.ua.emit('newRTCSession', sipstack.ua, {
        session: session
      });
    };

    test.failCall = function(session) {
      session = session || this.outgoingSession();
      sipstack.ua.emit('newRTCSession', sipstack.ua, {
        session: session
      });
      session.failed('local', 'somemessage', 'somecause');
    };

    test.outgoingSession = function(option) {
      option = option || {};
      var session = this.createSession();
      session.id = option.id || "someid";
      session.remote_identity = {
        uri: "remoteuri"
      };
      return session;
    };

    test.incomingSession = function() {
      var ExSIP = require('exsip');
      var session = this.createSession();
      session.id = "incomingid";
      session.direction = "incoming";
      session.status = ExSIP.RTCSession.C.STATUS_WAITING_FOR_ANSWER;
      session.remote_identity = {
        uri: "incoming_remote_uri"
      };
      return session;
    };

    test.createSession = function() {
      var ExSIP = require('exsip')
      var session = new ExSIP.RTCSession(sipstack.ua);
      session.hold = function(success) {
        session.held();
        if (success) {
          success();
        }
      }
      session.unhold = function(success) {
        session.resumed();
        if (success) {
          success();
        }
      }
      session.terminate = function(options) {
        session.ended('local');
      }
      session.answer = function(options) {
        answerOptions = options;
        session.started('local');
      }
      session.changeSession = function(options, success) {
        session.started('local');
        success();
      }
      return session;
    };

    test.incomingCall = function(session) {
      session = session || this.incomingSession();
      var request = {
        to_tag: "1234567",
        from_tag: "7654321",
        from: {
          display_name: "Incoming DisplayName",
          uri: {
            user: "Incoming User"
          }
        }
      };
      sipstack.ua.emit('newRTCSession', sipstack.ua, {
        session: session,
        request: request
      });
      return session;
    };


    test.mockWebRTC = function() {
      var self = this;
      console.debug = function(msg) {
        console.info(msg);
      }
      var ExSIP = require('exsip');
      ExSIP.WebRTC.RTCPeerConnection = function() {
        return {
          localDescription: null,
          remoteDescription: null,
          createDTMFSender: function() {
            return {}
          },
          close: function() {},
          setRemoteDescription: function(description, success, failure) {
            this.remoteDescription = description;
            if (success) {
              success();
            }
          },
          addStream: function() {},
          createOffer: function(success) {
            success(new ExSIP.WebRTC.RTCSessionDescription());
          },
          createAnswer: function(success) {
            success(new ExSIP.WebRTC.RTCSessionDescription());
          },
          setLocalDescription: function(description) {
            this.localDescription = description;
          }
        }
      };
      ExSIP.WebRTC.getUserMedia = function(constraints, success, failure) {
        success(self.createLocalMedia());
      };
      ExSIP.WebRTC.isSupported = true;
      ExSIP.UA.prototype.recoverTransport = function() {}
    };

    test.mockWebRTC();
    return test;
  };

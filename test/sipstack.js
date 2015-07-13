var test = require('./includes/common')(require('../node_modules/webrtc-core/test/includes/common'));
describe('sipstack', function() {

  var createModel = function() {
    test.createModelAndView('sipstack', {
        sipstack: require('../')
    });
  };

  beforeEach(function() {
    test.createCore('urlconfig');
    test.createCore('cookieconfig');
    createModel();
  });

  it('RTCMediaHandlerOptions and bandwidth med change', function() {
    sipstack.ua.setRtcMediaHandlerOptions = function(options) {
      rtcMediaHandlerOptions = options;
    }
    sipstack.encodingResolution = '640x360';
    sipstack.bandwidthMed =  "600";
    expect(sipstack.encodingResolution).toEqual('640x360');
    expect(rtcMediaHandlerOptions).toEqual({
      RTCConstraints: {
        'optional': [],
        'mandatory': {}
      },
      "disableICE": true,
      "reuseLocalMedia": true,
      "videoBandwidth": "600"
    });
  });
  it('RTCMediaHandlerOptions and bandwidth low change for resolution 180', function() {
    sipstack.ua.setRtcMediaHandlerOptions = function(options) {
      rtcMediaHandlerOptions = options;
    }
    sipstack.bandwidthLow = "200";
    sipstack.encodingResolution = '320x180';
    expect(rtcMediaHandlerOptions).toEqual({
      RTCConstraints: {
        'optional': [],
        'mandatory': {}
      },
      "disableICE": true,
      "reuseLocalMedia": true,
      "videoBandwidth": "200"
    });
  });
    it('getExSIPConfig() with userid with empty spaces', function() {
    cookieconfig.userid = 'my user id';
    expect(sipstack.getExSIPConfig().uri).toEqual("my%20user%20id@broadsoftlabs.com");
    cookieconfig.userid = null;
  });
  it('getExSIPOptions:', function() {
    sipstack.encodingResolution = '640x480';
    sipstack.audioOnly = false;
    var options = {
      mediaConstraints: {
        audio: true,
        video: {
          mandatory: {
            maxWidth: 640,
            maxHeight: 480
          }
        }
      },
      createOfferConstraints: {
        mandatory: {
          OfferToReceiveAudio: true,
          OfferToReceiveVideo: true
        }
      }
    };
    expect(sipstack.getExSIPOptions()).toEqual(options);
  });
  it('getExSIPOptions with resolution', function() {
    sipstack.audioOnly = false;
    sipstack.encodingResolution = '320x240';
    var options = {
      mediaConstraints: {
        audio: true,
        video: {
          mandatory: {
            maxWidth: 320,
            maxHeight: 240
          }
        }
      },
      createOfferConstraints: {
        mandatory: {
          OfferToReceiveAudio: true,
          OfferToReceiveVideo: true
        }
      }
    };
    expect(sipstack.getExSIPOptions()).toEqual(options);
  });
  it('getExSIPOptions with audioOnlyView', function() {
    urlconfig.audioOnlyView = true;
    createModel();
    var options = {
      mediaConstraints: {
        audio: true,
        video: false
      },
      createOfferConstraints: {
        mandatory: {
          OfferToReceiveAudio: true,
          OfferToReceiveVideo: false
        }
      }
    };
    expect(sipstack.getExSIPOptions()).toEqual(options);
    urlconfig.audioOnlyView = false;
  });
  it('getExSIPOptions with resolution 960x720', function() {
    sipstack.audioOnly = false;
    sipstack.encodingResolution = '960x720';
    var options = {
      mediaConstraints: {
        audio: true,
        video: {
          mandatory: {
            minWidth: 960,
            minHeight: 720
          }
        }
      },
      createOfferConstraints: {
        mandatory: {
          OfferToReceiveAudio: true,
          OfferToReceiveVideo: true
        }
      }
    };
    expect(sipstack.getExSIPOptions()).toEqual(options);
  });
  it('getExSIPOptions with hd=true', function() {
    urlconfig.hd = true;
    sipstack.encodingResolution = '960x720';
    var options = {
      mediaConstraints: {
        audio: true,
        video: {
          mandatory: {
            minWidth: 1280,
            minHeight: 720
          }
        }
      },
      createOfferConstraints: {
        mandatory: {
          OfferToReceiveAudio: true,
          OfferToReceiveVideo: true
        }
      }
    };
    expect(sipstack.getExSIPOptions()).toEqual(options);
  });
  it('websocketsServers', function() {
    sipstack.websocketsServers = [{
      'ws_uri': 'ws://webrtc-gw1.broadsoft.com:8060',
      'weight': 0
    }, {
      'ws_uri': 'ws://webrtc-gw2.broadsoft.com:8060',
      'weight': 0
    }, {
      'ws_uri': 'ws://webrtc-gw.broadsoft.com:8060',
      'weight': 0
    }];
    expect(sipstack.ua.configuration.ws_servers.length).toEqual(3);
  });
  it('networkUserId set', function() {
    sipstack.networkUserId = '8323303809';
    expect(sipstack.ua.configuration.authorization_user).toEqual('8323303809');
    expect(sipstack.ua.configuration.uri.toString()).toEqual('sip:8323303809@' + sipstack.domainFrom);
    sipstack.networkUserId = false;
  });
  it('WEBRTC-41 : networkUserId and userId set', function() {
    location.search = '?userid=8323303810';
    sipstack.networkUserId = '8323303809';
    expect(sipstack.ua.configuration.authorization_user).toEqual('8323303809', "networkUserId takes precendence over userid");
    sipstack.networkUserId = false;
  });
  it('enableConnectLocalMedia', function() {
    expect(sipstack.enableConnectLocalMedia).toEqual(true);
  });
  it('enableIms = true', function() {
    sipstack.enableIms = true;
    expect(sipstack.ua.configuration.enable_ims).toEqual(true);
  });
  it('enableIms = false', function() {
    sipstack.enableIms = false;
    expect(sipstack.ua.configuration.enable_ims).toEqual(false);
  });
  it('userid:', function() {
    cookieconfig.userid = '123456';
    expect(sipstack.ua.configuration.uri !== undefined).toEqual(true);
  });
  it('register with cookieconfig.userid', function() {
    cookieconfig.userid = '12345';
    expect(sipstack.getExSIPConfig("1509", false).register).toEqual(true);
    test.connect();
    sipstack.ua.emit('registered', sipstack.ua);
    expect(sipstack.registered).toEqual(true, "should have received registered from UA");
    cookieconfig.userid = null;
  });
  it('register with cookieconfig.userid and wrong user', function() {
    cookieconfig.userid = 'wronguserid';
    expect(sipstack.getExSIPConfig("1509", false).register).toEqual(true);
    test.connect();
    test.registrationFailed(404);
    expect(sipstack.registrationStatus).toEqual('404', "should have received registrationFailed 404 from UA");
    cookieconfig.userid = null;
  });
  it('without settingUserID', function() {
    sipstack.userid = '';
    expect(sipstack.getExSIPConfig("1509", "4009").register).toEqual(false);
  });
});
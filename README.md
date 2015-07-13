# SIP Stack

Integrates the ExSIP library.

Model : bdsft_webrtc.default.sipstack
Dependencies : ExSIP

## Properties
<a name="properties"></a>

Property            |Type             |Description
--------------------|-----------------|-----------------------------------------------------------------------------------------------------------------------------
callState           |string or array  |The current call state as one of the following: 'connected', 'disconnected', 'calling', 'started'. If call is put on hold the call state will be ['started', 'held'].
connected           |boolean          |True if the websocket is connected to the WRS.
connecting          |boolean          |True if the websocket is connecting to the WRS.
failed              |boolean          |True if the websocket connection failed.
failedCause         |string           |Cause of the websocket disconnection.
mediaConstraints    |object			  |WebRTC media constraints. (see https://w3c.github.io/mediacapture-main/getusermedia.html#mediastreamconstraints)
registered          |boolean          |True if the user is registered.
registering         |boolean          |True if it is registering on the WRS.
registrationStatus  |number           |Status code of the registration.
unregistering       |boolean          |True if it is unregistering on the WRS.
userMediaFailed     |boolean          |True if the user's local media stream could not be retrieved.

## Configuration
<a name="configuration"></a>

Property                 |Type     |Default                                                              |Description
-------------------------|---------|---------------------------------------------------------------------|------------------------------------------------------------
audioOnly                |boolean  |false                                                                |True if no video should be sent.
debug                    |debug    |false                                                                |True if debug logs should be displayed in the console.
disableICE               |boolean  |true                                                                 |True if ICE should be disabled.
domainFrom               |string   |broadsoftlabs.com                                                    |Appended to the SIP URI if no domain was specified for userId or networkUserId.
enableAutoAnswer         |boolean  |false                                                                |True if an incoming call should be automatically answered.
enable ConnectLocalMedia  |boolean  |true                                                                 |True if the users microphone and/or video should be accessed before a call already.
enabled                  |boolean  |true                                                                 |True if the sipstack is enabled
enableDatachannel        |boolean  |false                                                                |True if the datachannel should be enabled.
enableIms                |boolean  |false                                                                |True if the sipstack should be enabled to operate in an IMS environment. The 'user=phone' URI parameter is added to the request-URI, From, To and P-Asserted-Identity.
encodingResolution       |string   |640x480                                                              |The encoding resolution to be used on a call.
endCallURL               |string   |false                                                                |Where to send the browser at the end of a call.
networkUserId            |string   |false                                                                |The SIP User ID used for non registered calling.
offer ToReceiveVideo      |boolean  |true                                                                 |True if video should be received.
pAssertedIdentity        |string   |<sip:webguest @broadsoftlabs.com\>                                     |The P-Asserted-Identity SIP header.
stunPort                 |number   |3478                                                                 |The STUN server port.
stunServer               |string   |stun.broadsoftlabs.com                                               |The STUN server address.
websockets Servers        |array    |[\{'ws_uri':'wss://webrtc-gw.broadsoftlabs.com:8443', 'weight': 0}]  |The WRS address and weight within the array.


## Methods
<a name="methods"></a>

<table>
	<tr>
	<th>Method</th>
	<th>Parameters</th>
	<th>Description</th>
	</tr>
	<tr>
	<td>call(destination)</td>
	<td>destination : SIP URI or PSTN eg. 13019779440 </td>
	<td>Calls a SIP URI.</td>
	</tr>
	<tr>
	<td>endCall(options)</td>
	<td>options : {<br>'rtcSession': either 'all' to terminate all calls or a specific rtcSession to terminate<br>}</td>
	<td>Ends all calls, a specific call or the active call if no options are specified.</td>
	</tr>
	<tr>
	<td>hold(successCb, failureCb)</td>
	<td>successCb : callback when hold was successful<br>failureCb : callback when hold failed</td>
	<td>Puts the current active call on hold.</td>
	</tr>
	<tr>
	<td>register()</td>
	<td></td>
	<td>Sends a REGISTER request using the cookieconfig's userid, authenticationUserid and password.</td>
	</tr>
	<tr>
	<td>sendData(data)</td>
	<td>data : as string</td>
	<td>Sends data through the data channel if an active call exists.</td>
	</tr>
	<tr>
	<td>unhold(successCb, failureCb)</td>
	<td>successCb : callback when unhold was successful<br>failureCb : callback when unhold failed</td>
	<td>Removes the current active call from hold.</td>
	</tr>
	<tr>
	<td>unregister()</td>
	<td></td>
	<td>Sends a REGISTER request with expire=0 in order to unregister.</td>
	</tr>
</table>

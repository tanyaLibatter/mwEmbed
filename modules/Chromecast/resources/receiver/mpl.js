var senders = {};  // a list of Chrome senders
var maxBW = null;  // maximum bandwidth
var videoStreamIndex = -1;  // index for video stream
var audioStreamIndex = -1;  // index for audio stream
var licenseUrl = null;  // license server URL
var videoQualityIndex = -1;  // index for video quality level
var audioQualityIndex = -1;  // index for audio quality level
var manifestCredentials = false;  // a flag to indicate manifest credentials
var segmentCredentials = false;  // a flag to indicate segment credentials
var licenseCredentials = false;  // a flag to indicate license credentials
var streamVideoBitrates;  // bitrates of video stream selected
var streamAudioBitrates;  // bitrates of audio stream selected

var castReceiverManager = null; // an instance of cast.receiver.CastReceiverManager
var mediaManager = null;  // an instance of cast.receiver.MediaManager
var messageBus = null;  // custom message bus
var mediaElement = null;  // media element
var mediaPlayer = null;  // an instance of cast.player.api.Player
var playerInitialized = false;
var debugMode = true;
var kdp;
var idleTimerId_;
var currentState;
var isUnderflow = false;
var logoElement;
var maskAdEndedIdelState = false;
/**
 * The amount of time in a given state before the player goes idle.
 */
var IDLE_TIMEOUT = {
	LAUNCHING: 1000 * 60 * 5, // 5 minutes
	LOADING: 1000 * 60 * 5,  // 5 minutes
	PAUSED: 1000 * 60 * 20,  // 20 minutes
	DONE: 1000 * 60 * 5,     // 5 minutes
	IDLE: 1000 * 60 * 5      // 5 minutes
};
var State = {
	LAUNCHING: 'launching',
	LOADING: 'loading',
	BUFFERING: 'buffering',
	PLAYING: 'playing',
	PAUSED: 'paused',
	DONE: 'done',
	IDLE: 'idle'
};

function setState(state, opt_crossfade, opt_delay) {
	currentState = state;
	//self.element_.setAttribute('state', state);
	//self.updateApplicationState_();
	setIdleTimeout_(IDLE_TIMEOUT[state.toUpperCase()]);
	console.info("Set state: " + state);
}

function setIdleTimeout_ (t) {
	//this.log_('setIdleTimeout_: ' + t);
	clearTimeout(idleTimerId_);
	if (t) {
		idleTimerId_ = setTimeout(function() {
			castReceiverManager.stop();
		}, t);
	}
}

onload = function () {
	if (debugMode){
		cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.DEBUG);
	}

	logoElement =  document.getElementById('logo');

	setState(State.LAUNCHING, false);

	mediaElement = document.getElementById('receiverVideoElement');
	//mediaElement.autoplay = true;

	mediaManager = new cast.receiver.MediaManager(mediaElement);
	setMediaManagerEvents();
	castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
	messageBus = castReceiverManager.getCastMessageBus('urn:x-cast:com.kaltura.cast.player',  cast.receiver.CastMessageBus.JSON);

	setCastReceiverManagerEvents();
	//setTimeout(function(){
		initApp();
	//},10000);

	messageBus.onMessage = onMessage.bind(this);
};

function onMessage(event){
	var payload = JSON.parse(event['data']);
	console.log('### Message Bus - Media Message: ', payload);
	if (payload['type'] === 'show') {
		if (payload['target'] === 'logo') {
			logoElement.style.display = 'block';
		} else {
			document.getElementById('receiverVideoElement').style.display = 'block';
		}
	} else if (payload['type'] === 'hide') {
		if (payload['target'] === 'logo') {
			logoElement.style.opacity = 0;
			setTimeout(function() {
				logoElement.style.display = 'none';
			},1000);
		} else {
			document.getElementById('receiverVideoElement').style.display = 'none';
		}
	} else if (payload['type'] === 'ENABLE_CC') {
		var trackNumber = payload['trackNumber'];
		setCaption(trackNumber);
	} else if (payload['type'] === 'WebVTT') {
		mediaPlayer.enableCaptions(false);
		mediaPlayer.enableCaptions(true, 'webvtt', 'captions.vtt');
	} else if (payload['type'] === 'TTML') {
		mediaPlayer.enableCaptions(false);
		mediaPlayer.enableCaptions(true, 'ttml', 'captions.ttml');
	} else if (payload['type'] === 'maxBW') {
		maxBW = payload['value'];
	} else if (payload['type'] === 'qualityIndex' &&
		payload['mediaType'] === 'video') {
		videoQualityIndex = payload['value'];
		setDebugMessage('videoQualityIndex', videoQualityIndex);
	} else if (payload['type'] === 'qualityIndex' &&
		payload['mediaType'] === 'audio') {
		audioQualityIndex = payload['value'];
		setDebugMessage('audioQualityIndex', audioQualityIndex);
	} else if (payload['type'] === 'customData') {
		customData = payload['value'];
		setDebugMessage('customData', customData);
	} else if (payload['type'] === 'load') {
		//setMediaManagerEvents();
	} else if (payload['type'] === 'notification') {
		kdp.sendNotification(payload['event'], [payload['data']]); // pass notification event to the player
	} else if (payload['type'] === 'setLogo') {
		document.getElementById('logo').style.backgroundImage = "url(" + payload['logo'] + ")";
	} else if (payload['type'] === 'changeMedia') {
		kdp.sendNotification('changeMedia', {"entryId": payload['entryId']});
	} else {
		licenseUrl = null;
	}
	// broadcast(event['data']);
}

function setMediaManagerEvents() {
	mediaManager.customizedStatusCallback= function(status){
		console.info(status);
		if (maskAdEndedIdelState && (status.playerState = cast.receiver.media.PlayerState.IDLE)){
			console.info("Preventing IDLE on ad ended event, set player state to BUFFERING");
			status.playerState = cast.receiver.media.PlayerState.PLAYING;
			maskAdEndedIdelState = false;
		}
		if (maskAdEndedIdelState && (status.playerState === cast.receiver.media.PlayerState.PLAYING)){

		}
		return status;
	};
	/**
	 * Called when the media ends.
	 *
	 * mediaManager.resetMediaElement(cast.receiver.media.IdleReason.FINISHED);
	 **/
	mediaManager['onEndedOrig'] = mediaManager.onEnded;
	/**
	 * Called when the media ends
	 */
	mediaManager.onEnded = function () {
		setDebugMessage('mediaManagerMessage', 'ENDED');
		if (kdp.evaluate('{sequenceProxy.isInSequence}')) {
			maskAdEndedIdelState = true;
		} else {
			logoElement.style.opacity = 1;
			setTimeout(function() {
				kdp.sendNotification("hidePlayerControls");
				logoElement.style.display = 'block';
			},1000);
			setState(State.IDLE, true);
			mediaManager['onEndedOrig']();
		}
	};

	/**
	 * Default implementation of onError.
	 *
	 * mediaManager.resetMediaElement(cast.receiver.media.IdleReason.ERROR)
	 **/
	mediaManager['onErrorOrig'] = mediaManager.onError;
	/**
	 * Called when there is an error not triggered by a LOAD request
	 * @param {Object} obj An error object from callback
	 */
	mediaManager.onError = function (obj) {
		setDebugMessage('mediaManagerMessage', 'ERROR - ' + JSON.stringify(obj));
		setState(State.IDLE, true);
		mediaManager['onErrorOrig'](obj);
		if (mediaPlayer) {
			mediaPlayer.unload();
			mediaPlayer = null;
		}
	};

	/**
	 * Processes the get status event.
	 *
	 * Sends a media status message to the requesting sender (event.data.requestId)
	 **/
	mediaManager['onGetStatusOrig'] = mediaManager.onGetStatus;
	/**
	 * Processes the get status event.
	 * @param {Object} event An status object
	 */
	mediaManager.onGetStatus = function (event) {
		console.log('### Media Manager - GET STATUS: ' + JSON.stringify(event));
		setDebugMessage('mediaManagerMessage', 'GET STATUS ' +
			JSON.stringify(event));

		mediaManager['onGetStatusOrig'](event);
	};

	/**
	 * Default implementation of onLoadMetadataError.
	 *
	 * mediaManager.resetMediaElement(cast.receiver.media.IdleReason.ERROR, false);
	 * mediaManager.sendLoadError(cast.receiver.media.ErrorType.LOAD_FAILED);
	 **/
	mediaManager['onLoadMetadataErrorOrig'] = mediaManager.onLoadMetadataError;
	/**
	 * Called when load has had an error, overridden to handle application
	 * specific logic.
	 * @param {Object} event An object from callback
	 */
	mediaManager.onLoadMetadataError = function (event) {
		console.log('### Media Manager - LOAD METADATA ERROR: ' +
			JSON.stringify(event));
		setDebugMessage('mediaManagerMessage', 'LOAD METADATA ERROR: ' +
			JSON.stringify(event));

		mediaManager['onLoadMetadataErrorOrig'](event);
	};

	/**
	 * Default implementation of onMetadataLoaded
	 *
	 * Passed a cast.receiver.MediaManager.LoadInfo event object
	 * Sets the mediaElement.currentTime = loadInfo.message.currentTime
	 * Sends the new status after a LOAD message has been completed succesfully.
	 * Note: Applications do not normally need to call this API.
	 * When the application overrides onLoad, it may need to manually declare that
	 * the LOAD request was sucessful. The default implementaion will send the new
	 * status to the sender when the video/audio element raises the
	 * 'loadedmetadata' event.
	 * The default behavior may not be acceptable in a couple scenarios:
	 *
	 * 1) When the application does not want to declare LOAD succesful until for
	 *    example 'canPlay' is raised (instead of 'loadedmetadata').
	 * 2) When the application is not actually loading the media element (for
	 *    example if LOAD is used to load an image).
	 **/
	mediaManager['onLoadMetadataOrig'] = mediaManager.onLoadMetadataLoaded;
	/**
	 * Called when load has completed, overridden to handle application specific
	 * logic.
	 * @param {Object} event An object from callback
	 */
	mediaManager.onLoadMetadataLoaded = function (event) {
		console.log('### Media Manager - LOADED METADATA: ' +
			JSON.stringify(event));
		setDebugMessage('mediaManagerMessage', 'LOADED METADATA: ' +
			JSON.stringify(event));
		mediaManager['onLoadMetadataOrig'](event);
	};

	/**
	 * Processes the pause event.
	 *
	 * mediaElement.pause();
	 * Broadcast (without sending media information) to all senders that pause has
	 * happened.
	 **/
	mediaManager['onPauseOrig'] = mediaManager.onPause;
	/**
	 * Process pause event
	 * @param {Object} event
	 */
	mediaManager.onPause = function (event) {
		console.log('### Media Manager - PAUSE: ' + JSON.stringify(event));
		var isIdle = this.state_ === State.IDLE;
		var isDone = kdp.evaluate("{video.player.currentTime}") === kdp.evaluate("{duration}");
		if (isUnderflow) {
			setState(State.BUFFERING, false);
		} else if (!isIdle && !isDone) {
			setState(State.PAUSED, false);
		}
		kdp.sendNotification("doPause");
		mediaManager['onPauseOrig'](event);
	};

	/**
	 * Default - Processes the play event.
	 *
	 * mediaElement.play();
	 *
	 **/
	mediaManager['onPlayOrig'] = mediaManager.onPlay;
	/**
	 * Process play event
	 * @param {Object} event
	 */
	mediaManager.onPlay = function (event) {
		console.log('### Media Manager - PLAY');
		setDebugMessage('mediaManagerMessage', 'PLAY: ' + JSON.stringify(event));
		kdp.sendNotification("doPlay");
		//mediaManager['onPlayOrig'](event);
	};

	/**
	 * Default implementation of the seek event.
	 * Sets the mediaElement.currentTime to event.data.currentTime. If the
	 * event.data.resumeState is cast.receiver.media.SeekResumeState.PLAYBACK_START
	 * and the mediaElement is paused then call mediaElement.play(). Otherwise if
	 * event.data.resumeState is cast.receiver.media.SeekResumeState.PLAYBACK_PAUSE
	 * and the mediaElement is not paused, call mediaElement.pause().
	 * Broadcast (without sending media information) to all senders that seek has
	 * happened.
	 **/
	mediaManager['onSeekOrig'] = mediaManager.onSeek;
	/**
	 * Process seek event
	 * @param {Object} event
	 */
	mediaManager.onSeek = function (event) {
		console.log('### Media Manager - SEEK: ' + JSON.stringify(event));
		setDebugMessage('mediaManagerMessage', 'SEEK: ' + JSON.stringify(event));
		if (kdp.evaluate('{sequenceProxy.isInSequence}')) {
			var requestId = event.data.requestId;
			window.mediaManager.broadcastStatus(true, requestId);
		} else {
			mediaManager['onSeekOrig'](event);
		}
	};

	/**
	 * Default implementation of the set volume event.
	 * Checks event.data.volume.level is defined and sets the mediaElement.volume
	 * to the value.
	 * Checks event.data.volume.muted is defined and sets the mediaElement.muted
	 * to the value.
	 * Broadcasts (without sending media information) to all senders that the
	 * volume has changed.
	 **/
	mediaManager['onSetVolumeOrig'] = mediaManager.onSetVolume;
	/**
	 * Process set volume event
	 * @param {Object} event
	 */
	mediaManager.onSetVolume = function (event) {
		console.log('### Media Manager - SET VOLUME: ' + JSON.stringify(event));
		setDebugMessage('mediaManagerMessage', 'SET VOLUME: ' +
			JSON.stringify(event));

		mediaManager['onSetVolumeOrig'](event);
	};

	/**
	 * Processes the stop event.
	 *
	 * mediaManager.resetMediaElement(cast.receiver.media.IdleReason.CANCELLED,
	 *   true, event.data.requestId);
	 *
	 * Resets Media Element to IDLE state. After this call the mediaElement
	 * properties will change, paused will be true, currentTime will be zero and
	 * the src attribute will be empty. This only needs to be manually called if
	 * the developer wants to override the default behavior of onError, onStop or
	 * onEnded, for example.
	 **/
	mediaManager['onStopOrig'] = mediaManager.onStop;
	/**
	 * Process stop event
	 * @param {Object} event
	 */
	mediaManager.onStop = function (event) {
		console.log('### Media Manager - STOP: ' + JSON.stringify(event));
		setState(State.IDLE, false);
		mediaManager['onStopOrig'](event);
	};

	/**
	 * Default implementation for the load event.
	 *
	 * Sets the mediaElement.autoplay to false.
	 * Checks that data.media and data.media.contentId are valid then sets the
	 * mediaElement.src to the data.media.contentId.
	 *
	 * Checks the data.autoplay value:
	 *   - if undefined sets mediaElement.autoplay = true
	 *   - if has value then sets mediaElement.autoplay to that value
	 **/
	mediaManager['onLoadOrig'] = mediaManager.onLoad;
	/**
	 * Processes the load event.
	 * @param {Object} event
	 */
	mediaManager.onLoad = function (event) {
		clearTimeout(idleTimerId_);
		var embedInfo = event.data.media.customData;
		broadcast({"type": "mediaManager.onLoad"});
		console.log('### Media Manager - LOAD: ', event.data);

		logoElement.style.display = 'block';
		logoElement.style.opacity = 1;
		//if (mediaPlayer) {
		//	mediaElement.pause();
		//	mediaPlayer.unload();
		//	mediaPlayer = null;
		//}

		if (!playerInitialized) {
			embedPlayer(embedInfo);
		} else {
			//If same entry is sent then reload, else perform changeMedia
			if(kdp.evaluate('{mediaProxy.entry.id}') === embedInfo['entryID']){
				kdp.sendNotification("doPlay");
			} else {
				kdp.sendNotification("changeMedia", {"entryId": embedInfo['entryID']});
			}
		}
	};
}

function embedPlayer(embedInfo){
	var playerLib = embedInfo["lib"] + "mwEmbedLoader.php";
	var s = document.createElement("script");
	s.type = "text/javascript";
	s.src = playerLib;
	document.head.appendChild(s);
	setState(State.LOADING, false);
	var intervalID = setInterval(function () {
		if (typeof mw !== "undefined") {
			clearInterval(intervalID);
			mw.setConfig("EmbedPlayer.HidePosterOnStart", true);
			if (embedInfo['debugKalturaPlayer'] == true) {
				mw.setConfig("debug", true);
			}
			mw.setConfig("chromecastReceiver", true);
			mw.setConfig("Kaltura.ExcludedModules", "chromecast");
			self.setState(State.LOADING, false);
			//embedInfo['flashVars'].LeadWithHLSOnJs = true;
			//embedInfo['flashVars'].dash = {plugin:true};
			embedInfo['flashVars'].autoPlay = true;
			kWidget.embed({
				"targetId": "kaltura_player",
				"wid": "_" + embedInfo['publisherID'],
				"uiconf_id": embedInfo['uiconfID'],
				"readyCallback": function (playerId) {
					if (!playerInitialized) {
						playerInitialized = true;
						kdp = document.getElementById(playerId);
						$("#receiverVideoElement").remove();
						mediaElement = $(kdp).contents().contents().find("video")[0];
						mediaManager.setMediaElement(mediaElement);
						broadcast({"tyep": "mediaHostState: success"});


						kdp.kBind("broadcastToSender", function (msg) {
							var mediaInfo = mediaManager.getMediaInformation();
							mediaInfo.duration = kdp.evaluate('{duration}');
							mediaManager.setMediaInformation(mediaInfo);
							broadcast(msg);
						});
						kdp.kBind("onPlay", function (msg) {
							setState(State.PLAYING, false);
						});
					}
				},
				"flashvars": embedInfo['flashVars'],
				"entry_id": embedInfo['entryID']
			});
		}
	}, 100);
}

function initApp() {
	console.log('### Application Loaded. Starting system.');
	castReceiverManager.start();
}

function setCastReceiverManagerEvents() {
	castReceiverManager.onReady = function (event) {
		console.log('### Cast Receiver Manager is READY: ' + JSON.stringify(event));
		setState(State.IDLE, false);
	};

	castReceiverManager.onShutdown = function(){
		broadcast({"type": "shutdown"}); // receiver was shut down by the browser Chromecast icon - send message to the player to stop the app
	};

	castReceiverManager.onSenderConnected = function (event) {
		console.log('### Cast Receiver Manager - Sender Connected : ' +
			JSON.stringify(event));
		senders = castReceiverManager.getSenders();
	};

	castReceiverManager.onSenderDisconnected = function (event) {
		console.log('### Cast Receiver Manager - Sender Disconnected : ' +
			JSON.stringify(event));
		senders = castReceiverManager.getSenders();
		if ((senders.length === 0) &&
			(event.reason == cast.receiver.system.DisconnectReason.REQUESTED_BY_SENDER)) {
			castReceiverManager.stop();
		}
	};

	castReceiverManager.onSystemVolumeChanged = function (event) {
		console.log('### Cast Receiver Manager - System Volume Changed : ' +
			JSON.stringify(event.data));

		// See cast.receiver.media.Volume
		console.log('### Volume: ' + event.data['level'] + ' is muted? ' +
			event.data['muted']);
	};
}

function setCaption(trackNumber) {
	var current, next;
	if (protocol) {
		var streamCount = protocol.getStreamCount();
		var streamInfo;
		for ( current = 0 ; current < streamCount ; current++ ) {
			if ( protocol.isStreamEnabled( current ) ) {
				streamInfo = protocol.getStreamInfo( current );
				if ( streamInfo.mimeType.indexOf( 'text' ) === 0 ) {
					protocol.enableStream( current , false );
					mediaPlayer.enableCaptions( false );
					break;
				}
			}
		}
		if ( trackNumber ) {
			protocol.enableStream( trackNumber , true );
			mediaPlayer.enableCaptions( true );
		}
	}
}

function nextCaption() {
	var current, next;
	if (protocol) {
		var streamCount = protocol.getStreamCount();
		var streamInfo;
		for ( current = 0 ; current < streamCount ; current++ ) {
			if ( protocol.isStreamEnabled( current ) ) {
				streamInfo = protocol.getStreamInfo( current );
				if ( streamInfo.mimeType.indexOf( 'text' ) === 0 ) {
					break;
				}
			}
		}

		if ( current === streamCount ) {
			next = 0;
		} else {
			next = current + 1;
		}

		while ( next !== current ) {
			if ( next === streamCount ) {
				next = 0;
			}

			streamInfo = protocol.getStreamInfo( next );
			if ( streamInfo.mimeType.indexOf( 'text' ) === 0 ) {
				break;
			}

			next++;
		}

		if ( next !== current ) {
			if ( current !== streamCount ) {
				protocol.enableStream( current , false );
				mediaPlayer.enableCaptions( false );
			}

			if ( next !== streamCount ) {
				protocol.enableStream( next , true );
				mediaPlayer.enableCaptions( true );
			}
		}
	}
}



/*
 * send message to a sender via custom message channel
 @param {string} senderId A id string for specific sender
 @param {string} message A message string
 */
function messageSender(senderId, message) {
	messageBus.send(senderId, message);
}

/*
 * broadcast message to all senders via custom message channel
 @param {string} message A message string
 */
function broadcast(message) {
	console.info("Broadcast message: ", message);
	messageBus.broadcast(JSON.stringify(message));
}

/*
 * set debug message on receiver screen/TV
 @param {string} message A message string
 */
function setDebugMessage(elementId, message) {
	if (debugMode){
		document.getElementById(elementId).innerHTML = '' + JSON.stringify(message);
	}
}

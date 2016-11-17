
( function( mw, $ ) { "use strict";
	// Add chromecast player:
	$( mw ).bind('EmbedPlayerUpdateMediaPlayers', function( event, mediaPlayers ){
		var chromecastSupportedProtocols = ['video/h264', 'video/mp4', 'application/vnd.apple.mpegurl'];
		var chromecastReceiverPlayer = new mw.MediaPlayer('chromecastReceiver', chromecastSupportedProtocols, 'ChromecastReceiver');
		mediaPlayers.addPlayer(chromecastReceiverPlayer);
	});

	mw.EmbedPlayerChromecastReceiver = {
		// Instance name:
		instanceOf : 'ChromecastReceiver',
		bindPostfix: '.embedPlayerChromecastReceiver',
		// List of supported features:
		supports : {
			'playHead' : true,
			'pause' : true,
			'stop' : true,
			'volumeControl' : true,
			'overlays': true
		},
		mediaPlayer: null,
		preloaded: false,
		seeking: false,
		triggerReplayEvent: false, // since native replay is not supported in the Receiver, we use this flag to send a replay event to Analytics
		currentTime: 0,
		nativeEvents: [
			'loadstart',
			'progress',
			'suspend',
			'abort',
			'error',
			'emptied',
			'stalled',
			'play',
			'pause',
			'loadedmetadata',
			'loadeddata',
			'waiting',
			'playing',
			'canplay',
			'canplaythrough',
			'seeking',
			'seeked',
			'timeupdate',
			'ended',
			'ratechange',
			'durationchange',
			'volumechange'
		],

		setup: function( readyCallback ) {
			$(this).trigger("chromecastReceiverLoaded");
			this.getPlayerElement().preload = "auto";
			this.getPlayerElement().setAttribute("preload", "auto")
			this.addBindings();
			this.applyMediaElementBindings();
			var _this = this;
			$.getScript("//www.gstatic.com/cast/sdk/libs/mediaplayer/1.0.0/media_player.js").
				then(function(){
				_this.loadPlayer();
				readyCallback();

			});
		},
		/**
		 * Apply player bindings for getting events from mpl.js
		 */
		addBindings: function(){
			var _this = this;
			this.bindHelper("loadPlayer", this.loadPlayer.bind(this));
			this.bindHelper("layoutBuildDone", function(){
				_this.getVideoHolder().css("backgroundColor","transparent");
				$("body").css("backgroundColor","transparent");

			});
			this.bindHelper("loadstart", function(){

				//_this.applyMediaElementBindings();
				//mw.log('EmbedPlayerChromecastReceiver:: Setup. Video element: '+_this.getPlayerElement().attr("id").toString());
				//_this._propagateEvents = true;
				//$(_this.getPlayerElement()).css('position', 'absolute');
				_this.stopped = false;
			});
			this.bindHelper("replay", function(){
				_this.triggerReplayEvent = true;
				_this.triggerHelper("playerReady"); // since we reload the media for replay, trigger playerReady to reset Analytics
			});
			this.bindHelper("postEnded", function(){
				_this.currentTime = _this.getPlayerElement().duration;
				_this.updatePlayheadStatus();
			});
			this.bindHelper("onAdOpen", function(){
				_this.triggerHelper("broadcastToSender", [{type: "chromecastReceiverAdOpen"}]);
			});
			this.bindHelper("AdSupport_AdUpdateDuration", function(event, duration){
				_this.triggerHelper("broadcastToSender", [{type: "chromecastReceiverAdDuration", "duration": duration}]);
			});
			this.bindHelper("onContentResumeRequested", function(){
				_this.triggerHelper("broadcastToSender", [{type: "chromecastReceiverAdComplete"}]);
				_this.triggerHelper("cancelAllAds");
			});
			this.bindHelper("ccSelectClosedCaptions sourceSelectedByLangKey", function(e, label){
				_this.triggerHelper("propertyChangedEvent", {"plugin": "closedCaptions", "property":"captions", "value": typeof label === "string" ? label : label[0]});
				$(parent.document.getElementById('captionsOverlay')).empty();
			});
		},
		loadPlayer: function(e, data){
			if (this.mediaPlayer !== null) {
				this.mediaPlayer.unload(); // Ensure unload before loading again
			}

			var url = this.getSrc();
			//this.resolveSrcURL( src ).then(
			//	function(source){
			//		return source;
			//	},
			//	function () { //error
			//		return src;
			//	})
			//	.then( function(url ){


				this.mediaHost = new cast.player.api.Host({
					'mediaElement': this.getPlayerElement(),
					'url': url
				});

				//if (manifestCredentials) {
				//	mediaHost.updateManifestRequestInfo = function (requestInfo) {
				//		// example of setting CORS withCredentials
				//		if (!requestInfo.url) {
				//			requestInfo.url = url;
				//		}
				//		requestInfo.withCredentials = true;
				//	};
				//}
				//if (segmentCredentials) {
				//	mediaHost.updateSegmentRequestInfo = function (requestInfo) {
				//		// example of setting CORS withCredentials
				//		requestInfo.withCredentials = true;
				//		// example of setting headers
				//		//requestInfo.headers = {};
				//		//requestInfo.headers['content-type'] = 'text/xml;charset=utf-8';
				//	};
				//}
				//if (licenseCredentials) {
				//	mediaHost.updateLicenseRequestInfo = function (requestInfo) {
				//		// example of setting CORS withCredentials
				//		requestInfo.withCredentials = true;
				//	};
				//}
				//


				//if ((videoQualityIndex != -1 && streamVideoBitrates &&
				//	videoQualityIndex < streamVideoBitrates.length) ||
				//	(audioQualityIndex != -1 && streamAudioBitrates &&
				//	audioQualityIndex < streamAudioBitrates.length)) {
				//	mediaHost['getQualityLevelOrig'] = mediaHost.getQualityLevel;
				//	mediaHost.getQualityLevel = function (streamIndex, qualityLevel) {
				//		if (streamIndex == videoStreamIndex && videoQualityIndex != -1) {
				//			return videoQualityIndex;
				//		} else if (streamIndex == audioStreamIndex &&
				//			audioQualityIndex != -1) {
				//			return audioQualityIndex;
				//		} else {
				//			return qualityLevel;
				//		}
				//	};
				//}

				this.mediaHost.onError = function (errorCode, requestStatus) {
					this.log('### HOST ERROR - Fatal Error: code = ' + errorCode);
					if (this.mediaPlayer !== null) {
						this.mediaPlayer.unload();
					}
				}.bind(this);

			this.mediaHost.onAutoPause = function(underflow){
				if (underflow){
					this.bufferStart();
				} else {
					this.bufferEnd();
				}

			}.bind(this);

				this.protocol = null;
				var mimeType = this.getSource().getMIMEType();

				this.mediaHost.licenseUrl = this.buildUdrmLicenseUri(mimeType);

				switch(mimeType){
					case "application/vnd.apple.mpegurl":
						this.protocol = cast.player.api.CreateHlsStreamingProtocol(this.mediaHost);
						break;
					case "application/dash+xml":
						this.protocol = cast.player.api.CreateDashStreamingProtocol(this.mediaHost);
						break;
					case "video/playreadySmooth":
						this.protocol = cast.player.api.CreateSmoothStreamingProtocol(this.mediaHost);
						break;
				}

				// Advanced Playback - HLS, MPEG DASH, SMOOTH STREAMING
				// Player registers to listen to the media element events through the
				// mediaHost property of the  mediaElement

				this.mediaPlayer = new cast.player.api.Player(this.mediaHost);
				var startTimeDuration = this.startTime;
				var initialTimeIndexSeconds = this.isLive() ? Infinity : startTimeDuration;
				this.mediaPlayer.preload(this.protocol);
				this.preloaded = true;
			//}.bind(this));
		},
		buildUdrmLicenseUri: function(mimeType) {
			var licenseServer = mw.getConfig('Kaltura.UdrmServerURL');
			var licenseParams = this.mediaElement.getLicenseUriComponent();
			var licenseUri = null;

			if (licenseServer && licenseParams) {
				// Build licenseUri by mimeType.
				switch (mimeType) {
					case "video/wvm":
						// widevine classic
						licenseUri = licenseServer + "/widevine/license?" + licenseParams;
						break;
					case "application/dash+xml":
						// widevine modular, because we don't have any other dash DRM right now.
						licenseUri = licenseServer + "/cenc/widevine/license?" + licenseParams;
						break;
					case "application/vnd.apple.mpegurl":
						// fps
						licenseUri = licenseServer + "/fps/license?" + licenseParams;
						break;
					default:
						break;
				}
			}

			return licenseUri;
		},
		/**
		 * Apply media element bindings
		 */
		applyMediaElementBindings: function () {
			var _this = this;
			this.log("MediaElementBindings");
			var vid = this.getPlayerElement();
			if (!vid) {
				this.log(" Error: applyMediaElementBindings without player elemnet");
				return;
			}
			$.each(_this.nativeEvents, function (inx, eventName) {
				$(vid).unbind(eventName + _this.bindPostfix).bind(eventName + _this.bindPostfix, function () {
					// make sure we propagating events, and the current instance is in the correct closure.
					(eventName!=="timeupdate") && console.info(eventName);
					if (_this._propagateEvents && _this.instanceOf == 'ChromecastReceiver') {
						var argArray = $.makeArray(arguments);
						// Check if there is local handler:
						if (_this[ '_on' + eventName ]) {
							_this[ '_on' + eventName ].apply(_this, argArray);
						} else {
							// No local handler directly propagate the event to the abstract object:
							$(_this).trigger(eventName, argArray);
						}
					}
				});
			});
		},

		play: function(){
			//If got play and we are in ended state then need to replay by reloading media first
			if (this.currentState == "end") {
				this.log("Reloading media player");
				this.mediaPlayer.reload();
			}
			//Check that ads are not playing
			if (this.parent_play()) {
				//In case we are in preloaded state we need to attach the media source to the
				//video element now, before actual playback starts
				if (this.preloaded){
					this.preloaded = false;
					this.log("Attach preloaded media player");
					this.mediaPlayer.load();
				}
				this.log("Play when have enough data");
				this.mediaPlayer.playWhenHaveEnoughData();
			}
		},
		pause: function(){
			this.parent_pause();
			this.getPlayerElement().pause();
		},

		/**
		 * Handle the native paused event
		 */
		_onpause: function () {
			console.info("underflow: " + this.mediaPlayer.getState()['underflow']);
			if (this.mediaPlayer.getState()['underflow']){
				console.info("buffer start");
			} else {
				this.pause();
				$(this).trigger('onPlayerStateChange', ["pause", "play"]);
			}

		},
		_onplaying:function(){
			console.info("underflow: " + this.mediaPlayer.getState()['underflow']);
			this.hideSpinner();
			this.triggerHelper("playing");
			this.triggerHelper( 'hidePlayerControls' );
		},
		/**
		 * Handle the native play event
		 */
		_onplay: function (){
			console.info("underflow: " + this.mediaPlayer.getState()['underflow']);
			this.restoreEventPropagation();
			//if (this.currentState === "pause" || this.currentState === "start"){
			//	this.play();
			//	this.triggerHelper('onPlayerStateChange', [ "play", this.currentState ]);
			//}
			//if (this.triggerReplayEvent){
			//	this.triggerHelper('replayEvent');
			//	this.triggerReplayEvent = false;
			//}
			this.triggerHelper( 'hidePlayerControls' );

		},
		replay: function(){
			var _this = this;
			this.restoreEventPropagation();
			this.restoreComponentsHover();
		},

		_onseeking: function () {
			this.triggerHelper( 'hidePlayerControls' );
			if (!this.seeking) {
				this.seeking = true;
				if ( this._propagateEvents && !this.isLive() ) {
					this.triggerHelper('seeking');
				}
			}
		},

		_onseeked: function () {
			if (this.seeking) {
				this.seeking = false;
				if (this._propagateEvents && !this.isLive()) {
					this.triggerHelper('seeked', [this.getPlayerElementTime()]);
					this.triggerHelper("onComponentsHoverEnabled");
					this.syncCurrentTime();
					this.updatePlayheadStatus();
				}
			}
		},
		//_onended: function () {
		//	this.onClipDone();
		//},
		_onloadeddata: function(){
			return;
			if (this.protocol === undefined || this.protocol === null){
				return;
			}
			var streamCount = this.protocol.getStreamCount();
			var streamInfo;
			var streamVideoCodecs;
			var streamAudioCodecs;
			var captions = {};
			for (var c = 0; c < streamCount; c++) {
				streamInfo = this.protocol.getStreamInfo(c);
				if (streamInfo.mimeType.indexOf('text') === 0) {
					captions[c] = streamInfo.language;
				} else if (streamInfo.mimeType === 'video/mp4' ||
					streamInfo.mimeType === 'video/mp2t') {
					streamVideoCodecs = streamInfo.codecs;
					streamVideoBitrates = streamInfo.bitrates;
					var videoLevel;
					if (maxBW) {
						videoLevel = this.protocol.getQualityLevel(c, maxBW);
					}
					else {
						videoLevel = this.protocol.getQualityLevel(c);
					}
					this.log('streamVideoQuality', streamInfo.bitrates[videoLevel]);
					videoStreamIndex = c;
				} else if (streamInfo.mimeType === 'audio/mp4') {
					audioStreamIndex = c;
					//setDebugMessage('audioStreamIndex', audioStreamIndex);
					streamAudioCodecs = streamInfo.codecs;
					streamAudioBitrates = streamInfo.bitrates;
					var audioLevel = this.protocol.getQualityLevel(c);
					//setDebugMessage('streamAudioQuality', streamInfo.bitrates[audioLevel]);
				}
				else {
				}
			}
			//setDebugMessage('streamCount', streamCount);
			//setDebugMessage('streamVideoCodecs', streamVideoCodecs);
			//setDebugMessage('streamVideoBitrates', JSON.stringify(streamVideoBitrates));
			//setDebugMessage('streamAudioCodecs', streamAudioCodecs);
			//setDebugMessage('streamAudioBitrates', JSON.stringify(streamAudioBitrates));
			//setDebugMessage('captions', JSON.stringify(captions));

			// send captions to senders
			console.log(JSON.stringify(captions));
			if (Object.keys(captions).length > 0) {
				var caption_message = {};
				caption_message['captions'] = captions;
				//messageSender(senders[0], JSON.stringify(caption_message));
				broadcast(JSON.stringify(caption_message));
			}

			// send video bitrates to senders
			if (streamVideoBitrates && Object.keys(streamVideoBitrates).length > 0) {
				var video_bitrates_message = {};
				video_bitrates_message['video_bitrates'] = streamVideoBitrates;
				broadcast(JSON.stringify(video_bitrates_message));
			}

			// send audio bitrates to senders
			if (streamAudioBitrates && Object.keys(streamAudioBitrates).length > 0) {
				var audio_bitrates_message = {};
				audio_bitrates_message['audio_bitrates'] = streamAudioBitrates;
				broadcast(JSON.stringify(audio_bitrates_message));
			}
		},
		changeMediaCallback: function (callback) {
			this.changeMediaStarted = false;
			if (callback){
				callback();
			}
			this.play();
		},
		// override these functions so embedPlayer won't try to sync time
		syncCurrentTime: function(){
			this.currentTime = this.getPlayerElementTime();
		},

		_ondurationchange: function (event, data) {
			if ( this.playerElement && !isNaN(this.playerElement.duration) && isFinite(this.playerElement.duration) ) {
				this.setDuration(this.getPlayerElement().duration);
				return;
			}
		},

		_onended: function(){
			if (this._propagateEvents) {
				this.onClipDone();
			}
		},

		setPlayerElement: function (mediaElement) {
			this.playerElement = mediaElement;
		},
		getPlayerElement: function () {
			if (!this.playerElement) {
				this.playerElement = $('#' + this.pid).get(0);
			}
			return this.playerElement;
		},

		getPlayerElementTime: function(){
			return this.getPlayerElement().currentTime;
		},

		isVideoSiblingEnabled: function() {
			return false;
		},
		playerSwitchSource: function ( source , switchCallback , doneCallback ) {
			//we are not supposed to switch source. Ads can be played as siblings. Change media doesn't use this method.
			if ( switchCallback ) {
				switchCallback( this.playerObject );
			}
			setTimeout( function () {
				if ( doneCallback ) {
					doneCallback();
				}
			} , 100 );
		} ,
		canAutoPlay: function () {
			return true;
		}
	};
	} )( mediaWiki, jQuery );

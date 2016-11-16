(function ( mw, $ ) {
    "use strict";

    // Add Chromecast player:
    $( mw ).bind( 'EmbedPlayerUpdateMediaPlayers', function ( event, mediaPlayers ) {
        var chromecastSupportedProtocols = [ 'video/h264', 'video/mp4', 'application/vnd.apple.mpegurl' ];
        var chromecastReceiverPlayer = new mw.MediaPlayer( 'chromecastReceiver', chromecastSupportedProtocols, 'ChromecastReceiver' );
        mediaPlayers.addPlayer( chromecastReceiverPlayer );
    } );

    mw.EmbedPlayerChromecastReceiver = {
        // Instance name:
        instanceOf: 'ChromecastReceiver',
        bindPostfix: '.embedPlayerChromecastReceiver',
        // List of supported features:
        supports: {
            'playHead': true,
            'pause': true,
            'stop': true,
            'volumeControl': true,
            'overlays': true
        },
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

        /**
         * cast.api specific
         */

        /**
         * Constants
         */
        CAST_STATES: {
            LAUNCHING: 'launching',
            LOADING: 'loading',
            BUFFERING: 'buffering',
            PLAYING: 'playing',
            PAUSED: 'paused',
            DONE: 'done',
            IDLE: 'idle'
        },
        CAST_IDLE_TIMEOUTS: {
            LAUNCHING: 1000 * 60 * 5, // 5 minutes
            LOADING: 1000 * 60 * 5,  // 5 minutes
            PAUSED: 1000 * 60 * 20,  // 20 minutes
            DONE: 1000 * 60 * 5,     // 5 minutes
            IDLE: 1000 * 60 * 5      // 5 minutes
        },
        CAST_TYPES: {
            AUDIO: 'audio',
            VIDEO: 'video',
            UNKNOWN: 'unknown'
        },
        CAST_TEXT_TRACKS_TYPES: {
            SIDE_LOADED_TTML: 'ttml',
            SIDE_LOADED_VTT: 'vtt',
            SIDE_LOADED_UNSUPPORTED: 'unsupported',
            EMBEDDED: 'embedded'
        },
        BURN_IN_TIMEOUT: 30 * 1000,
        MEDIA_INFO_DURATION: 3 * 1000,
        TRANSITION_DURATION: 1.5,
        ENABLE_DEBUG: true,
        DISABLE_DEBUG: false,

        setup: function ( readyCallback ) {
            var _this = this;
            $( this ).trigger( "chromecastReceiverLoaded" );
            $.getScript( '//www.gstatic.com/cast/sdk/libs/mediaplayer/1.0.0/media_player.js' )
                .then( function () {
                    _this.initCastMediaLibrary();
                    _this.addBindings();
                    readyCallback();
                } );
        },

        initCastMediaLibrary: function () {
            this.state = null;
            this.type = null;
            this.playerAutoPlay = null;
            this.currentApplicationState = null;
            this.textTrackType = null;
            this.playerReady = null;
            this.deferredPlayCallbackId = null;
            this.preloadPlayer = null;
            this.player = null;

            this.setState( this.CAST_STATES.LAUNCHING );

            this.setPlayerElement( document.querySelector( 'video' ) );
            this.playerElement.addEventListener( 'error', this.onMediaElementError.bind( this ), false );
            this.playerElement.addEventListener( 'playing', this.onMediaElementPlaying.bind( this ), false );
            this.playerElement.addEventListener( 'pause', this.onMediaElementPause.bind( this ), false );
            this.playerElement.addEventListener( 'ended', this.onMediaElementEnded.bind( this ), false );
            this.playerElement.addEventListener( 'abort', this.onMediaElementAbort.bind( this ), false );
            this.playerElement.addEventListener( 'timeupdate', this.onMediaElementProgress.bind( this ), false );
            this.playerElement.addEventListener( 'seeking', this.onMediaElementSeekStart.bind( this ), false );
            this.playerElement.addEventListener( 'seeked', this.onMediaElementSeekEnd.bind( this ), false );
            this.playerElement.addEventListener( 'stalled', this.bufferingHandler.bind( this ), false );
            this.playerElement.addEventListener( 'waiting', this.bufferingHandler.bind( this ), false );

            this.receiverManager = top.CastReceiverVars.receiverManager;
            this.receiverManager.onReady = this.onReady.bind( this );
            this.receiverManager.onSenderConnected = this.onSenderConnected.bind( this );
            this.receiverManager.onSenderDisconnected = this.onSenderDisconnected.bind( this );
            this.receiverManager.setApplicationState( this.getApplicationState() );

            this.mediaManager = top.CastReceiverVars.mediaManager;
            this.mediaManager.setMediaElement( this.playerElement );
            this.mediaManager.onLoad = this.onMediaLoad.bind( this );
            this.mediaManager.onPreload = this.onMediaPreload.bind( this );
            this.mediaManager.onMetadataLoaded = this.onMediaMetadataLoaded.bind( this );
            this.mediaManager.onStop = this.onMediaStop.bind( this );
            this.mediaManager.onLoadMetadataError = this.onLoadMediaMetadataError.bind( this );
            this.mediaManager.onError = this.onMediaError.bind( this );
            this.mediaManager.customizedStatusCallback = this.customizedStatusCallback.bind( this );

            this.messageBus = top.CastReceiverVars.messageBus;
            this.messageBus.onMessage = this.onCustomMessage.bind( this );

            this.onMediaLoad( top.CastReceiverVars.mediaInfo );
        },

        /**
         * Player element events
         */

        onMediaElementError: function ( error ) {
            debugger;
        },

        onMediaElementPlaying: function ( event ) {
            debugger;
            this._cancelDeferredPlay( 'media is already playing' );
            this.setState( this.CAST_STATES.PLAYING );
            this._onplaying();
        },

        _cancelDeferredPlay: function ( reason ) {
            if ( this.deferredPlayCallbackId ) {
                clearTimeout( this.deferredPlayCallbackId );
                this.deferredPlayCallbackId = null;
            }
        },

        onMediaElementPause: function ( event ) {
            debugger;
        },

        onMediaElementEnded: function ( event ) {
            debugger;
        },

        onMediaElementAbort: function ( event ) {
            debugger;
        },

        onMediaElementProgress: function ( event ) {
            debugger;
        },

        onMediaElementSeekStart: function ( event ) {
            debugger;
        },

        onMediaElementSeekEnd: function ( event ) {
            debugger;
        },

        bufferingHandler: function ( event ) {

        },

        /**
         * Receiver manager events
         */

        onReady: function ( event ) {
            debugger;
        },

        onSenderConnected: function ( event ) {
            debugger;
        },

        onSenderDisconnected: function ( event ) {
            debugger;
        },

        getApplicationState: function ( mediaInfo ) {
            debugger;
            if ( mediaInfo && mediaInfo.metadata && mediaInfo.metadata.title ) {
                return 'Now Casting: ' + media.metadata.title;
            } else if ( mediaInfo ) {
                return 'Now Casting';
            } else {
                return 'Ready To Cast';
            }
        },

        _updateApplicationState: function () {
            debugger;
            if ( this._mediaManager ) {
                var idle = this.CAST_STATES === this.CAST_STATES.IDLE;
                var media = idle ? null : this.mediaManager.getMediaInformation();
                var applicationState = this.getApplicationState( media );
                if ( this.currentApplicationState !== applicationState ) {
                    this.currentApplicationState = applicationState;
                    this.receiverManager.setApplicationState( applicationState );
                }
            }
        },

        /**
         * Media manager events
         */

        onMediaPreload: function ( event ) {

        },

        onMediaLoad: function ( info ) {
            debugger;
            var _this = this;
            var media = info.media || {};
            var mediaType = _this._getMediaType( media || null );
            var preLoaded = false;
            _this._resetMediaPlayer();
            switch ( mediaType ) {
                case this.CAST_TYPES.AUDIO:
                    //TODO: needs to handle audio?
                    break;
                case this.CAST_TYPES.VIDEO:
                    preLoaded = _this._loadVideo( info );
                    break;
                case this.CAST_TYPES.UNKNOWN:
                    //TODO: How to handle unknown cast type?
                    break;
            }
            _this.playerReady = false;
            if ( preLoaded ) {
                _this.setState( this.CAST_STATES.PLAYING, false );
                _this.playerReady = true;
                _this.playerAutoPlay = false;
                _this._deferPlay( 0 );
            }
            else {
                _this.setState( _this.CAST_STATES.LOADING, false );
                _this.playerReady = true;
                if ( _this.playerAutoPlay ) {
                    _this._deferPlay( _this.MEDIA_INFO_DURATION );
                    _this.playerAutoPlay = false;
                }
            }
        },

        _getMediaType: function ( media ) {
            debugger;
            var contentType = media ? media.contentType : this.getSource().getMIMEType();
            var contentUrlPath = media ? media.contentId : this.getSrc();

            if ( contentType.indexOf( 'audio/' ) === 0 ) {
                return this.CAST_TYPES.AUDIO;
            } else if ( contentType.indexOf( 'video/' ) === 0 ) {
                return this.CAST_TYPES.VIDEO;
            } else if ( contentType.indexOf( 'application/x-mpegurl' ) === 0 ) {
                return this.CAST_TYPES.VIDEO;
            } else if ( contentType.indexOf( 'application/vnd.apple.mpegurl' ) === 0 ) {
                return this.CAST_TYPES.VIDEO;
            } else if ( contentType.indexOf( 'application/dash+xml' ) === 0 ) {
                return this.CAST_TYPES.VIDEO;
            } else if ( contentType.indexOf( 'application/vnd.ms-sstr+xml' ) === 0 ) {
                return this.CAST_TYPES.VIDEO;
            } else if ( this._getExtension( contentUrlPath ) === 'mp3' ) {
                return this.CAST_TYPES.AUDIO;
            } else if ( this._getExtension( contentUrlPath ) === 'oga' ) {
                return this.CAST_TYPES.AUDIO;
            } else if ( this._getExtension( contentUrlPath ) === 'wav' ) {
                return this.CAST_TYPES.AUDIO;
            } else if ( this._getExtension( contentUrlPath ) === 'mp4' ) {
                return this.CAST_TYPES.VIDEO;
            } else if ( this._getExtension( contentUrlPath ) === 'ogv' ) {
                return this.CAST_TYPES.VIDEO;
            } else if ( this._getExtension( contentUrlPath ) === 'webm' ) {
                return this.CAST_TYPES.VIDEO;
            } else if ( this._getExtension( contentUrlPath ) === 'm3u8' ) {
                return this.CAST_TYPES.VIDEO;
            } else if ( this._getExtension( contentUrlPath ) === 'mpd' ) {
                return this.CAST_TYPES.VIDEO;
            } else if ( contentType.indexOf( '.ism' ) != 0 ) {
                return this.CAST_TYPES.VIDEO;
            }
            return this.Type.UNKNOWN;
        },

        _getExtension: function ( url ) {
            debugger;
            var parts = url.split( '.' );
            if ( parts.length === 1 || (parts[ 0 ] === '' && parts.length === 2) ) {
                return '';
            }
            return parts.pop().toLowerCase();
        },

        _resetMediaPlayer: function () {
            debugger;
            if ( this.player ) {
                this.player.unload();
                this.player = null;
            }
            this.textTrackType = null;
        },

        _loadVideo: function ( info ) {
            debugger;
            var _this = this;
            var url = info.media.contentId;
            var type = info.media.contentType || '';
            var protocolFunc = this._getProtocolFunction( type );
            var wasPreLoaded = false;
            this._handleAutoPlay( info );
            if ( !protocolFunc ) {
                this.playerElement.addEventListener( 'stalled', this.bufferingHandler, false );
                this.playerElement.addEventListener( 'waiting', this.bufferingHandler, false );
            }
            else {
                this.playerElement.removeEventListener( 'stalled', this.bufferingHandler );
                this.playerElement.removeEventListener( 'waiting', this.bufferingHandler );
                var loadErrorCallback = function () {
                    if ( _this.player ) {
                        _this._resetMediaPlayer();
                        _this.playerElement.dispatchEvent( new Event( 'error' ) );
                    }
                };
                if ( !this.preloadPlayer
                    || (this.preloadPlayer.getHost && this.preloadPlayer.getHost().url !== url) ) {
                    if ( this.preloadPlayer ) {
                        this.preloadPlayer.unload();
                        this.preloadPlayer = null;
                    }
                    var host = new cast.player.api.Host( {
                        'url': url,
                        'mediaElement': this.playerElement
                    } );
                    host.onError = loadErrorCallback;
                    this.player = new cast.player.api.Player( host );
                    this.player.load( protocolFunc( host ) );
                }
                else {
                    this.player = this.preloadPlayer;
                    this.preloadPlayer = null;
                    this.player.getHost().onError = loadErrorCallback;
                    this.player.load();
                    wasPreLoaded = true;
                }
            }
            return wasPreLoaded;
        },

        _getProtocolFunction: function ( mimeType ) {
            if ( mimeType === "application/vnd.apple.mpegurl" ) {
                return cast.player.api.CreateHlsStreamingProtocol;
            }
            else if ( mimeType === "application/dash+xml" ) {
                return cast.player.api.CreateDashStreamingProtocol;
            }
            else if ( mimeType === "video/playreadySmooth" ) {
                return cast.player.api.CreateSmoothStreamingProtocol;
            }
            else {
                return null;
            }
        },

        _handleAutoPlay: function ( info ) {
            var autoPlay = info.autoplay;
            info.autoplay = false;
            this.playerElement.autoplay = false;
            this.playerAutoPlay = (autoPlay === undefined ? true : autoPlay);
        },

        _deferPlay: function ( timeout ) {
            var _this = this;
            this.deferredPlayCallbackId = setTimeout( function () {
                _this.deferredPlayCallbackId = null;
                if ( _this._player ) {
                    _this._player.playWhenHaveEnoughData();
                } else {
                    _this.playerElement.play();
                }
            }, timeout );
        },

        onMediaMetadataLoaded: function ( event ) {
            debugger;
        },

        onMediaStop: function ( event ) {
            debugger;
        },

        onLoadMediaMetadataError: function ( error ) {
            debugger;
        },

        onMediaError: function ( error ) {
            debugger;
        },

        customizedStatusCallback: function ( event ) {
            debugger;
        },

        /**
         * Message bus event
         */

        onCustomMessage: function ( event ) {
            debugger;
        },

        /**
         *
         * @param state
         */
        setState: function ( state ) {
            debugger;
            this.state = state;
            this._updateApplicationState();
        },

        /**
         * Apply player bindings for getting events from mpl.js
         */
        addBindings: function () {
            var _this = this;
            this.bindHelper( "layoutBuildDone", function () {
                _this.getVideoHolder().css( "backgroundColor", "transparent" );
                $( "body" ).css( "backgroundColor", "transparent" );

            } );
            this.bindHelper( "loadstart", function () {

                _this.applyMediaElementBindings();
                mw.log( 'EmbedPlayerChromecastReceiver:: Setup. Video element: ' + _this.getPlayerElement().toString() );
                _this._propagateEvents = true;
                $( _this.getPlayerElement() ).css( 'position', 'absolute' );
                _this.stopped = false;
            } );
            this.bindHelper( "replay", function () {
                _this.triggerReplayEvent = true;
                _this.triggerHelper( "playerReady" ); // since we reload the media for replay, trigger playerReady to reset Analytics
            } );
            this.bindHelper( "postEnded", function () {
                _this.currentTime = _this.getPlayerElement().duration;
                _this.updatePlayheadStatus();
            } );
            this.bindHelper( "onAdOpen", function ( event, id, system, type ) {
                _this.triggerHelper( "broadcastToSender", [ "chromecastReceiverAdOpen" ] );
            } );
            this.bindHelper( "AdSupport_AdUpdateDuration", function ( event, duration ) {
                _this.triggerHelper( "broadcastToSender", [ "chromecastReceiverAdDuration|" + duration ] );
            } );
            this.bindHelper( "onContentResumeRequested", function () {
                _this.triggerHelper( "broadcastToSender", [ "chromecastReceiverAdComplete" ] );
                _this.triggerHelper( "cancelAllAds" );
            } );
            this.bindHelper( "ccSelectClosedCaptions sourceSelectedByLangKey", function ( e, label ) {
                _this.triggerHelper( "propertyChangedEvent", {
                    "plugin": "closedCaptions",
                    "property": "captions",
                    "value": typeof label === "string" ? label : label[ 0 ]
                } );
                $( parent.document.getElementById( 'captionsOverlay' ) ).empty();
            } );
        },

        /**
         * Apply media element bindings
         */
        applyMediaElementBindings: function () {
            var _this = this;
            this.log( "MediaElementBindings" );
            var vid = this.getPlayerElement();
            if ( !vid ) {
                this.log( " Error: applyMediaElementBindings without player elemnet" );
                return;
            }
            $.each( _this.nativeEvents, function ( inx, eventName ) {
                $( vid ).unbind( eventName + _this.bindPostfix ).bind( eventName + _this.bindPostfix, function () {
                    // make sure we propagating events, and the current instance is in the correct closure.
                    if ( _this._propagateEvents && _this.instanceOf == 'ChromecastReceiver' ) {
                        var argArray = $.makeArray( arguments );
                        // Check if there is local handler:
                        if ( _this[ '_on' + eventName ] ) {
                            _this[ '_on' + eventName ].apply( _this, argArray );
                        } else {
                            // No local handler directly propagate the event to the abstract object:
                            $( _this ).trigger( eventName, argArray );
                        }
                    }
                } );
            } );
        },

        play: function () {
            debugger;
            this.parent_play();
            this.hideSpinner();
        },
        /**
         * Handle the native paused event
         */

        _onpause: function () {
            this.pause();
            $( this ).trigger( 'onPlayerStateChange', [ "pause", "play" ] );

        },

        _onplaying: function () {
            debugger;
            this.hideSpinner();
            this.triggerHelper( "playing" );
            this.triggerHelper( 'hidePlayerControls' );
        },

        /**
         * Handle the native play event
         */
        _onplay: function () {
            debugger;
            this.restoreEventPropagation();
            if ( this.currentState === "pause" || this.currentState === "start" ) {
                this.play();
                this.triggerHelper( 'onPlayerStateChange', [ "play", this.currentState ] );
            }
            if ( this.triggerReplayEvent ) {
                this.triggerHelper( 'replayEvent' );
                this.triggerReplayEvent = false;
            }
            this.triggerHelper( 'hidePlayerControls' );

        },

        replay: function () {
            var _this = this;
            this.restoreEventPropagation();
            this.restoreComponentsHover();
        },

        _onseeking: function () {
            this.triggerHelper( 'hidePlayerControls' );
            if ( !this.seeking ) {
                this.seeking = true;
                if ( this._propagateEvents && !this.isLive() ) {
                    this.triggerHelper( 'seeking' );
                }
            }
        },

        _onseeked: function () {
            if ( this.seeking ) {
                this.seeking = false;
                if ( this._propagateEvents && !this.isLive() ) {
                    this.triggerHelper( 'seeked', [ this.getPlayerElementTime() ] );
                    this.triggerHelper( "onComponentsHoverEnabled" );
                    this.syncCurrentTime();
                    this.updatePlayheadStatus();
                }
            }
        },

        changeMediaCallback: function ( callback ) {
            this.changeMediaStarted = false;
            if ( callback ) {
                callback();
            }
            this.play();
        },

        // Override these functions so embedPlayer won't try to sync time
        syncCurrentTime: function () {
            debugger;
            this.currentTime = this.getPlayerElementTime();
        },

        _ondurationchange: function ( event, data ) {
            if ( this.playerElement && !isNaN( this.playerElement.duration ) && isFinite( this.playerElement.duration ) ) {
                this.setDuration( this.getPlayerElement().duration );
                return;
            }
        },

        _onended: function () {
            if ( this._propagateEvents ) {
                this.onClipDone();
            }
        },

        setPlayerElement: function ( mediaElement ) {
            this.playerElement = mediaElement;
        },

        getPlayerElement: function () {
            return this.playerElement;
        },

        getPlayerElementTime: function () {
            return this.getPlayerElement().currentTime;
        },

        isVideoSiblingEnabled: function () {
            return false;
        },

        canAutoPlay: function () {
            return true;
        }
    };
})( mediaWiki, jQuery );

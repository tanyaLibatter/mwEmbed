/**
 * Cast player constructor.
 * @param {!Element} element the element to attach the player
 * @struct
 * @constructor
 * @export
 */
function CastPlayer( element ) {
    debugger;
    /**
     * The debug setting to control receiver, MPL and player logging.
     * @private {boolean}
     */
    this._debug = CastPlayer._DISABLE_DEBUG;
    if ( this._debug ) {
        cast.player.api.setLoggerLevel( cast.player.api.LoggerLevel.DEBUG );
        cast.receiver.logger.setLevelValue( cast.receiver.LoggerLevel.DEBUG );
    }

    /**
     * The DOM element the player is attached.
     * @private {!Element}
     */
    this._element = element;

    /**
     * The current type of the player.
     * @private {remotePlayer.Type}
     */
    this._type;

    this._setType( CastPlayer.Type.UNKNOWN, false );

    /**
     * The current state of the player.
     * @private {remotePlayer.State}
     */
    this._state;

    /**
     * Timestamp when state transition happened last time.
     * @private {number}
     */
    this._lastStateTransitionTime = 0;

    this._setState( CastPlayer.State.LAUNCHING, false );

    /**
     * The id returned by setInterval for the screen burn timer
     * @private {number|undefined}
     */
    this._burnInPreventionIntervalId;

    /**
     * The id returned by setTimeout for the idle timer
     * @private {number|undefined}
     */
    this._idleTimerId;

    /**
     * The id of timer to handle seeking UI.
     * @private {number|undefined}
     */
    this._seekingTimerId;

    /**
     * The id of timer to defer setting state.
     * @private {number|undefined}
     */
    this._setStateDelayTimerId;

    /**
     * Current application state.
     * @private {string|undefined}
     */
    this._currentApplicationState;

    /**
     * The DOM element for the inner portion of the progress bar.
     * @private {!Element}
     */
    // this._progressBarInnerElement = this._getElementByClass( '.controls-progress-inner' );

    /**
     * The DOM element for the thumb portion of the progress bar.
     * @private {!Element}
     */
    // this._progressBarThumbElement = this._getElementByClass( '.controls-progress-thumb' );

    /**
     * The DOM element for the current time label.
     * @private {!Element}
     */
    // this._curTimeElement = this._getElementByClass( '.controls-cur-time' );

    /**
     * The DOM element for the total time label.
     * @private {!Element}
     */
    // this._totalTimeElement = this._getElementByClass( '.controls-total-time' );

    /**
     * The DOM element for the preview time label.
     * @private {!Element}
     */
    // this._previewModeTimerElement = this._getElementByClass( '.preview-mode-timer-countdown' );

    /**
     * Handler for buffering-related events for MediaElement.
     * @private {function()}
     */
    this._bufferingHandler = this._onBuffering.bind( this );

    /**
     * Media player to play given manifest.
     * @private {cast.player.api.Player}
     */
    this._player = null;

    /**
     * Media player used to preload content.
     * @private {cast.player.api.Player}
     */
    this._preloadPlayer = null;

    /**
     * Text Tracks currently supported.
     * @private {?remotePlayer.TextTrackType}
     */
    this._textTrackType = null;

    /**
     * Whether player app should handle autoplay behavior.
     * @private {boolean}
     */
    this._playerAutoPlay = true;

    /**
     * Whether player app should display the preview mode UI.
     * @private {boolean}
     */
    this._displayPreviewMode = false;

    /**
     * Id of deferred play callback
     * @private {?number}
     */
    this._deferredPlayCallbackId = null;

    /**
     * Whether the player is ready to receive messages after a LOAD request.
     * @private {boolean}
     */
    this._playerReady = false;

    /**
     * Whether the player has received the metadata loaded event after a LOAD
     * request.
     * @private {boolean}
     */
    this._metadataLoaded = false;

    /**
     * The media element.
     * @private {HTMLMediaElement}
     */
    this._mediaElement = this._element.querySelector( 'video' );
    this._mediaElement.addEventListener( 'error', this._onError.bind( this ), false );
    this._mediaElement.addEventListener( 'playing', this._onPlaying.bind( this ), false );
    this._mediaElement.addEventListener( 'pause', this._onPause.bind( this ), false );
    this._mediaElement.addEventListener( 'ended', this._onEnded.bind( this ), false );
    this._mediaElement.addEventListener( 'abort', this._onAbort.bind( this ), false );
    this._mediaElement.addEventListener( 'timeupdate', this._onProgress.bind( this ), false );
    this._mediaElement.addEventListener( 'seeking', this._onSeekStart.bind( this ), false );
    this._mediaElement.addEventListener( 'seeked', this._onSeekEnd.bind( this ), false );

    /**
     * The cast receiver manager.
     * @private {!cast.receiver.CastReceiverManager}
     */
    this._receiverManager = cast.receiver.CastReceiverManager.getInstance();
    this._receiverManager.onReady = this._onReady.bind( this );
    // this._receiverManager.onSenderDisconnected = this._onSenderDisconnected.bind( this );
    // this._receiverManager.onVisibilityChanged = this._onVisibilityChanged.bind( this );
    // this._receiverManager.setApplicationState( this._getApplicationState() );

    /**
     * The message bus.
     */
    this._messageBus = this._receiverManager.getCastMessageBus( 'urn:x-cast:com.kaltura.cast.player' );
    this._messageBus.onMessage = remotePlayer.EmbedPlayer.onMessage;

    /**
     * The remote media object.
     * @private {cast.receiver.MediaManager}
     */
    this._mediaManager = new cast.receiver.MediaManager( this._mediaElement );

    /**
     * The original load callback.
     * @private {?function(cast.receiver.MediaManager.Event)}
     */
    this._onLoadOrig = this._mediaManager.onLoad.bind( this._mediaManager );
    this._mediaManager.onLoad = remotePlayer._onLoad.bind( this );

    /**
     * The original editTracksInfo callback
     * @private {?function(!cast.receiver.MediaManager.Event)}
     */
    // this.onEditTracksInfoOrig_ = this._mediaManager.onEditTracksInfo.bind( this._mediaManager );
    // this._mediaManager.onEditTracksInfo = this._onEditTracksInfo.bind( this );

    /**
     * The original metadataLoaded callback
     * @private {?function(!cast.receiver.MediaManager.LoadInfo)}
     */
    this._onMetadataLoadedOrig = this._mediaManager.onMetadataLoaded.bind( this._mediaManager );
    this._mediaManager.onMetadataLoaded = this._onMetadataLoaded.bind( this );

    /**
     * The original stop callback.
     * @private {?function(cast.receiver.MediaManager.Event)}
     */
    // this._onStopOrig = this._mediaManager.onStop.bind( this._mediaManager );
    // this._mediaManager.onStop = this._onStop.bind( this );

    /**
     * The original metadata error callback.
     * @private {?function(!cast.receiver.MediaManager.LoadInfo)}
     */
    // this.onLoadMetadataErrorOrig_ = this._mediaManager.onLoadMetadataError.bind( this._mediaManager );
    // this._mediaManager.onLoadMetadataError = this._onLoadMetadataError.bind( this );

    /**
     * The original error callback
     * @private {?function(!Object)}
     */
    // this._onErrorOrig = this._mediaManager.onError.bind( this._mediaManager );
    // this._mediaManager.onError = this._onError.bind( this );

    // this._mediaManager.customizedStatusCallback = this._customizedStatusCallback.bind( this );

    // this._mediaManager.onPreload = this._onPreload.bind( this );
    // this._mediaManager.onCancelPreload = this._onCancelPreload.bind( this );
}

/**
 * The amount of time in a given state before the player goes idle.
 */
CastPlayer.IDLE_TIMEOUT = {
    LAUNCHING: 1000 * 60 * 5, // 5 minutes
    LOADING: 1000 * 60 * 5,  // 5 minutes
    PAUSED: 1000 * 60 * 20,  // 20 minutes
    DONE: 1000 * 60 * 5,     // 5 minutes
    IDLE: 1000 * 60 * 5      // 5 minutes
};

/**
 * Describes the type of media being played.
 *
 * @enum {string}
 */
CastPlayer.Type = {
    AUDIO: 'audio',
    VIDEO: 'video',
    UNKNOWN: 'unknown'
};

/**
 * Describes the type of captions being used.
 *
 * @enum {string}
 */
CastPlayer.TextTrackType = {
    SIDE_LOADED_TTML: 'ttml',
    SIDE_LOADED_VTT: 'vtt',
    SIDE_LOADED_UNSUPPORTED: 'unsupported',
    EMBEDDED: 'embedded'
};

/**
 * Describes the type of captions being used.
 *
 * @enum {string}
 */
CastPlayer.CaptionsMimeType = {
    TTML: 'application/ttml+xml',
    VTT: 'text/vtt'
};

/**
 * Describes the type of track.
 *
 * @enum {string}
 */
CastPlayer.TrackType = {
    AUDIO: 'audio',
    VIDEO: 'video',
    TEXT: 'text'
};

/**
 * Describes the state of the player.
 *
 * @enum {string}
 */
CastPlayer.State = {
    LAUNCHING: 'launching',
    LOADING: 'loading',
    BUFFERING: 'buffering',
    PLAYING: 'playing',
    PAUSED: 'paused',
    DONE: 'done',
    IDLE: 'idle'
};

/**
 * The amount of time (in ms) a screen should stay idle before burn in
 * prevention kicks in
 *
 * @type {number}
 */
CastPlayer.BURN_IN_TIMEOUT = 30 * 1000;

/**
 * The minimum duration (in ms) that media info is displayed.
 *
 * @const @private {number}
 */
CastPlayer._MEDIA_INFO_DURATION = 3 * 1000;

/**
 * Transition animation duration (in sec).
 *
 * @const @private {number}
 */
CastPlayer._TRANSITION_DURATION = 1.5;

/**
 * Const to enable debugging.
 *
 * @const @private {boolean}
 */
CastPlayer._ENABLE_DEBUG = true;

/**
 * Const to disable debugging.
 *
 * #@const @private {boolean}
 */
CastPlayer._DISABLE_DEBUG = false;

CastPlayer.prototype.start = function () {
    this._receiverManager.start();
};

CastPlayer.prototype.broadcast = function ( msg ) {
    this._messageBus.broadcast( msg );
};

/**
 * Loads the given data.
 *
 * @param {!cast.receiver.MediaManager.LoadInfo} info The load request info.
 * @export
 */
CastPlayer.prototype.load = function ( info ) {

    debugger;
    var _this = this;
    var media = info.message.media || {};
    var contentType = media.contentType;
    var playerType = CastPlayer._getType( media );
    var isLiveStream = media.streamType === cast.receiver.media.StreamType.LIVE;
    if ( !media.contentId ) {
        //_this._onLoadMetadataError( info );
    } else if ( playerType === CastPlayer.Type.UNKNOWN ) {
        //_this._onLoadMetadataError( info );
    } else {
        _this._resetMediaElement();
        _this._setType( playerType, isLiveStream );
        var preloaded = false;
        switch ( playerType ) {
            case CastPlayer.Type.AUDIO:
                _this._loadAudio( info );
                break;
            case CastPlayer.Type.VIDEO:
                preloaded = _this._loadVideo( info );
                break;
        }
        _this._playerReady = false;
        _this._metadataLoaded = false;
        _this._loadMetadata( media );
        _this.showPreviewModeMetadata( false );
        _this._displayPreviewMode = false;
        CastPlayer._preload( media, function () {
            //_this.log_( 'preloaded=' + preloaded );
            if ( preloaded ) {
                // Data is ready to play so transiton directly to playing.
                _this._setState( CastPlayer.State.PLAYING, false );
                _this._playerReady = true;
                _this._maybeSendLoadCompleted( info );
                // Don't display metadata again, since autoplay already did that.
                _this._deferPlay( 0 );
                _this._playerAutoPlay = false;
            } else {
                CastPlayer._transition( _this._element, CastPlayer._TRANSITION_DURATION, function () {
                    _this._setState( CastPlayer.State.LOADING, false );
                    // Only send load completed after we reach this point so the media
                    // manager state is still loading and the sender can't send any PLAY
                    // messages
                    _this._playerReady = true;
                    _this._maybeSendLoadCompleted( info );
                    if ( _this._playerAutoPlay ) {
                        // Make sure media info is displayed long enough before playback
                        // starts.
                        _this._deferPlay( CastPlayer._MEDIA_INFO_DURATION );
                        _this._playerAutoPlay = false;
                    }
                } );
            }
        } );
    }
};

/**
 * Defers playback start by given timeout.
 *
 * @param {number} timeout In msec.
 * @private
 */
CastPlayer.prototype._deferPlay = function ( timeout ) {
    //this.log_('Defering playback for ' + timeout + ' ms');
    var _this = this;
    this.deferredPlayCallbackId_ = setTimeout( function () {
        _this._deferredPlayCallbackId = null;
        if ( _this._player ) {
            //_this.log_('Playing when enough data');
            _this._player.playWhenHaveEnoughData();
        } else {
            //_this.log_('Playing');
            _this._mediaElement.play();
        }
    }, timeout );
};

/**
 * Sends the load complete message to the sender if the two necessary conditions
 * are met, the player is ready for messages and the loaded metadata event has
 * been received.
 * @param {!cast.receiver.MediaManager.LoadInfo} info The load request info.
 * @private
 */
CastPlayer.prototype._maybeSendLoadCompleted = function ( info ) {
    if ( !this._playerReady ) {
        //this.log_('Deferring load response, player not ready');
    } else if ( !this.metadataLoaded_ ) {
        //this.log_('Deferring load response, loadedmetadata event not received');
    } else {
        this._onMetadataLoadedOrig( info );
        //this.log_('Sent load response, player is ready and metadata loaded');
    }
};

/**
 * Called when metadata is loaded, at this point we have the tracks information
 * if we need to provision embedded captions.
 *
 * @param {!cast.receiver.MediaManager.LoadInfo} info The load information.
 * @private
 */
CastPlayer.prototype._onMetadataLoaded = function ( info ) {
    //this.log_('onMetadataLoaded');
    this._onLoadSuccess();
    // In the case of ttml and embedded captions we need to load the cues using
    // MPL.
    this._readSideLoadedTextTrackType( info );

    if ( this._textTrackType == CastPlayer.TextTrackType.SIDE_LOADED_TTML &&
        info.message && info.message.activeTrackIds && info.message.media &&
        info.message.media.tracks ) {
        this.processTtmlCues_(
            info.message.activeTrackIds, info.message.media.tracks );
    } else if ( !this._textTrackType ) {
        // If we do not have a textTrackType, check if the tracks are embedded
        this._maybeLoadEmbeddedTracksMetadata( info );
    }
    // Only send load completed when we have completed the player LOADING state
    this._metadataLoaded = true;
    this._maybeSendLoadCompleted( info );
};

/**
 * Loads embedded tracks information without loading media.
 * If there is embedded tracks information, it loads the tracks information
 * in the media manager without loading media.
 *
 * @param {!cast.receiver.MediaManager.LoadInfo} info The load request info.
 * @private
 */
CastPlayer.prototype._maybeLoadEmbeddedTracksMetadata = function ( info ) {
    if ( !info.message || !info.message.media ) {
        return;
    }
    var tracksInfo = this._readInBandTracksInfo();
    if ( tracksInfo ) {
        this.textTrackType_ = CastPlayer.TextTrackType.EMBEDDED;
        tracksInfo.textTrackStyle = info.message.media.textTrackStyle;
        this._mediaManager.loadTracksInfo( tracksInfo );
    }
};

/**
 * Reads in-band tracks info, if they exist.
 *
 * @return {cast.receiver.media.TracksInfo} The tracks info.
 * @private
 */
CastPlayer.prototype._readInBandTracksInfo = function () {
    var protocol = this.player_ ? this._player.getStreamingProtocol() : null;
    if ( !protocol ) {
        return null;
    }
    var streamCount = protocol.getStreamCount();
    var activeTrackIds = [];
    var tracks = [];
    for ( var i = 0; i < streamCount; i++ ) {
        var trackId = i + 1;
        if ( protocol.isStreamEnabled( i ) ) {
            activeTrackIds.push( trackId );
        }
        var streamInfo = protocol.getStreamInfo( i );
        var mimeType = streamInfo.mimeType;
        var track;
        if ( mimeType.indexOf( CastPlayer.TrackType.TEXT ) === 0 ||
            mimeType === CastPlayer.CaptionsMimeType.TTML ) {
            track = new cast.receiver.media.Track(
                trackId, cast.receiver.media.TrackType.TEXT );
        } else if ( mimeType.indexOf( CastPlayer.TrackType.VIDEO ) === 0 ) {
            track = new cast.receiver.media.Track(
                trackId, cast.receiver.media.TrackType.VIDEO );
        } else if ( mimeType.indexOf( CastPlayer.TrackType.AUDIO ) === 0 ) {
            track = new cast.receiver.media.Track(
                trackId, cast.receiver.media.TrackType.AUDIO );
        }
        if ( track ) {
            track.name = streamInfo.name;
            track.language = streamInfo.language;
            track.trackContentType = streamInfo.mimeType;
            tracks.push( track );
        }
    }
    if ( tracks.length === 0 ) {
        return null;
    }
    var tracksInfo = /** @type {cast.receiver.media.TracksInfo} **/ ({
        tracks: tracks,
        activeTrackIds: activeTrackIds
    });
    return tracksInfo;
};

/**
 * Called when the media is successfully loaded. Updates the progress bar.
 *
 * @private
 */
CastPlayer.prototype._onLoadSuccess = function () {
    //this.log_('onLoadSuccess');
    // we should have total time at this point, so update the label
    // and progress bar
    var totalTime = this._mediaElement.duration;
    if ( !isNaN( totalTime ) ) {
        this._totalTimeElement.textContent = CastPlayer._formatDuration( totalTime );
    } else {
        this._totalTimeElement.textContent = '';
        this._progressBarInnerElement.style.width = '100%';
        this._progressBarInnerElement.style.left = '100%';
    }
};


/**
 * Sets the captions type based on the text tracks.
 *
 * @param {!cast.receiver.MediaManager.LoadInfo} info The load request info.
 * @private
 */
CastPlayer.prototype._readSideLoadedTextTrackType = function ( info ) {
    if ( !info.message || !info.message.media || !info.message.media.tracks ) {
        return;
    }
    for ( var i = 0; i < info.message.media.tracks.length; i++ ) {
        var oldTextTrackType = this.textTrackType_;
        if ( info.message.media.tracks[ i ].type != cast.receiver.media.TrackType.TEXT ) {
            continue;
        }
        if ( this._isTtmlTrack( info.message.media.tracks[ i ] ) ) {
            this.textTrackType_ = CastPlayer.TextTrackType.SIDE_LOADED_TTML;
        } else if ( this._isVttTrack( info.message.media.tracks[ i ] ) ) {
            this.textTrackType_ = CastPlayer.TextTrackType.SIDE_LOADED_VTT;
        } else {
            //this.log_('Unsupported side loaded text track types');
            this.textTrackType_ = CastPlayer.TextTrackType.SIDE_LOADED_UNSUPPORTED;
            break;
        }
        // We do not support text tracks with different caption types for a single
        // piece of content
        if ( oldTextTrackType && oldTextTrackType != this.textTrackType_ ) {
            //this.log_('Load has inconsistent text track types');
            this.textTrackType_ = CastPlayer.TextTrackType.SIDE_LOADED_UNSUPPORTED;
            break;
        }
    }
};

/**
 * Checks if a track is VTT.
 *
 * @param {cast.receiver.media.Track} track The track.
 * @return {boolean} Whether the track is in VTT format.
 * @private
 */
CastPlayer.prototype._isVttTrack = function ( track ) {
    return this._isKnownTextTrack( track, CastPlayer.TextTrackType.SIDE_LOADED_VTT, CastPlayer.CaptionsMimeType.VTT );
};

/**
 * Checks if a track is of a known type by verifying the extension or mimeType.
 *
 * @param {cast.receiver.media.Track} track The track.
 * @param {!CastPlayer.TextTrackType} textTrackType The text track
 *     type expected.
 * @param {!string} mimeType The mimeType expected.
 * @return {boolean} Whether the track has the specified format.
 * @private
 */
CastPlayer.prototype._isKnownTextTrack = function ( track, textTrackType, mimeType ) {
    if ( !track ) {
        return false;
    }
    // The CastPlayer.TextTrackType values match the
    // file extensions required
    var fileExtension = textTrackType;
    var trackContentId = track.trackContentId;
    var trackContentType = track.trackContentType;
    if ( (trackContentId && CastPlayer._getExtension( trackContentId ) === fileExtension) || (trackContentType && trackContentType.indexOf( mimeType ) === 0) ) {
        return true;
    }
    return false;
};

/**
 * Checks if a track is TTML.
 *
 * @param {cast.receiver.media.Track} track The track.
 * @return {boolean} Whether the track is in TTML format.
 * @private
 */
CastPlayer.prototype._isTtmlTrack = function ( track ) {
    return this._isKnownTextTrack( track, CastPlayer.TextTrackType.SIDE_LOADED_TTML, CastPlayer.CaptionsMimeType.TTML );
};

/**
 * Preloads media data that can be preloaded.
 *
 * @param {!cast.receiver.media.MediaInformation} media The media to load.
 * @param {function()} doneFunc The function to call when done.
 * @private
 */
CastPlayer._preload = function ( media, doneFunc ) {
    if ( CastPlayer._isCastForAudioDevice() ) {
        // No preloading for Cast for Audio devices
        doneFunc();
        return;
    }

    var imagesToPreload = [];
    var counter = 0;
    var images = [];

    function imageLoaded() {
        if ( ++counter === imagesToPreload.length ) {
            doneFunc();
        }
    }

    // try to preload image metadata
    var thumbnailUrl = CastPlayer._getMediaImageUrl( media );
    if ( thumbnailUrl ) {
        imagesToPreload.push( thumbnailUrl );
    }
    if ( imagesToPreload.length === 0 ) {
        doneFunc();
    } else {
        for ( var i = 0; i < imagesToPreload.length; i++ ) {
            images[ i ] = new Image();
            images[ i ].src = imagesToPreload[ i ];
            images[ i ].onload = function () {
                imageLoaded();
            };
            images[ i ].onerror = function () {
                imageLoaded();
            };
        }
    }
};

/**
 * Display preview mode metadata.
 *
 * @param {boolean} show whether player is showing preview mode metadata
 * @export
 */
CastPlayer.prototype.showPreviewModeMetadata = function ( show ) {
    this._element.setAttribute( 'preview-mode', show.toString() );
};

/**
 * Loads the metadata for the given media.
 *
 * @param {!cast.receiver.media.MediaInformation} media The media.
 * @private
 */
CastPlayer.prototype._loadMetadata = function ( media ) {
    //this.log_('loadMetadata_');
    if ( !CastPlayer._isCastForAudioDevice() ) {
        var metadata = media.metadata || {};
        var titleElement = this._element.querySelector( '.media-title' );
        CastPlayer._setInnerText( titleElement, metadata.title );

        var subtitleElement = this._element.querySelector( '.media-subtitle' );
        CastPlayer._setInnerText( subtitleElement, metadata.subtitle );

        var artwork = CastPlayer._getMediaImageUrl( media );
        if ( artwork ) {
            var artworkElement = this._element.querySelector( '.media-artwork' );
            CastPlayer._setBackgroundImage( artworkElement, artwork );
        }
    }
};

/**
 * Sets the background image for the given element.
 *
 * @param {Element} element The element.
 * @param {string=} opt_url The image url.
 * @private
 */
CastPlayer._setBackgroundImage = function ( element, opt_url ) {
    if ( !element ) {
        return;
    }
    element.style.backgroundImage =
        (opt_url ? 'url("' + opt_url.replace( /"/g, '\\"' ) + '")' : 'none');
    element.style.display = (opt_url ? '' : 'none');
};


/**
 * Returns the image url for the given media object.
 *
 * @param {!cast.receiver.media.MediaInformation} media The media.
 * @return {string|undefined} The image url.
 * @private
 */
CastPlayer._getMediaImageUrl = function ( media ) {
    var metadata = media.metadata || {};
    var images = metadata[ 'images' ] || [];
    return images && images[ 0 ] && images[ 0 ][ 'url' ];
};

/**
 * Sets the inner text for the given element.
 *
 * @param {Element} element The element.
 * @param {string=} opt_text The text.
 * @private
 */
CastPlayer._setInnerText = function ( element, opt_text ) {
    if ( !element ) {
        return;
    }
    element.innerText = opt_text || '';
};

/**
 * Resets the media element.
 *
 * @private
 */
CastPlayer.prototype._resetMediaElement = function () {
    //this.log_('resetMediaElement_');
    if ( this._player ) {
        this._player.unload();
        this._player = null;
    }
    this._textTrackType = null;
};

/**
 * Returns the element with the given class name
 *
 * @param {string} className The class name of the element to return.
 * @return {!Element}
 * @throws {Error} If given class cannot be found.
 * @private
 */
CastPlayer.prototype._getElementByClass = function ( className ) {
    var element = this._element.querySelector( className );
    if ( element ) {
        return element;
    } else {
        throw Error( 'Cannot find element with class: ' + className );
    }
};

/**
 * Returns this player's media element.
 *
 * @return {HTMLMediaElement} The media element.
 * @export
 */
CastPlayer.prototype.getMediaElement = function () {
    return this._mediaElement;
};

/**
 * Returns this player's media manager.
 *
 * @return {cast.receiver.MediaManager} The media manager.
 * @export
 */
CastPlayer.prototype.getMediaManager = function () {
    return this._mediaManager;
};

/**
 * Returns this player's MPL player.
 *
 * @return {cast.player.api.Player} The current MPL player.
 * @export
 */
CastPlayer.prototype.getPlayer = function () {
    return this._player;
};

/**
 * Sets the type of player.
 *
 * @param {CastPlayer.Type} type The type of player.
 * @param {boolean} isLiveStream whether player is showing live content
 * @private
 */
CastPlayer.prototype._setType = function ( type, isLiveStream ) {
    this._type = type
};

/**
 * Sets the state of the player.
 *
 * @param {CastPlayer.State} state the new state of the player
 * @param {boolean=} opt_crossfade true if should cross fade between states
 * @param {number=} opt_delay the amount of time (in ms) to wait
 * @private
 */
CastPlayer.prototype._setState = function ( state, opt_crossfade, opt_delay ) {
    debugger;
    //this.log_('setState_: state=' + state + ', crossfade=' + opt_crossfade +
    var _this = this;
    _this._lastStateTransitionTime = Date.now();
    clearTimeout( _this._delay );
    if ( opt_delay ) {
        var func = function () {
            _this._setState( state, opt_crossfade );
        };
        _this._delay = setTimeout( func, opt_delay );
    } else {
        if ( !opt_crossfade ) {
            _this._state = state;
            _this._element.setAttribute( 'state', state );
            _this._updateApplicationState();
            _this._setIdleTimeout( CastPlayer.IDLE_TIMEOUT[ state.toUpperCase() ] );
        } else {
            var stateTransitionTime = _this._lastStateTransitionTime;
            CastPlayer._transition( _this._element, CastPlayer._TRANSITION_DURATION, function () {
                // In the case of a crossfade transition, the transition will be completed
                // even if setState is called during the transition.  We need to be sure
                // that the requested state is ignored as the latest setState call should
                // take precedence.
                if ( stateTransitionTime < _this._lastStateTransitionTime ) {
                    //self.log_( 'discarded obsolete deferred state(' + state + ').' );
                    return;
                }
                _this._setState( state, false );
            } );
        }
    }
};

/**
 * Sets the amount of time before the player is considered idle.
 *
 * @param {number} t the time in milliseconds before the player goes idle
 * @private
 */
CastPlayer.prototype._setIdleTimeout = function ( t ) {
    // this.log_('setIdleTimeout_: ' + t);
    var _this = this;
    clearTimeout( this._idleTimerId );
    if ( t ) {
        this._idleTimerId = setTimeout( function () {
            _this._receiverManager.stop();
        }, t );
    }
};

/**
 * Causes the given element to fade out, does something, and then fades
 * it back in.
 *
 * @param {!Element} element The element to fade in/out.
 * @param {number} time The total amount of time (in seconds) to transition.
 * @param {function()} something The function that does something.
 * @private
 */
CastPlayer._transition = function ( element, time, something ) {
    if ( time <= 0 || CastPlayer._isCastForAudioDevice() ) {
        // No transitions supported for Cast for Audio devices
        something();
    } else {
        CastPlayer._fadeOut( element, time / 2.0, function () {
            something();
            CastPlayer._fadeIn( element, time / 2.0 );
        } );
    }
};

/**
 * Called to determine if the receiver device is an audio device.
 *
 * @return {boolean} Whether the device is a Cast for Audio device.
 * @private
 */
CastPlayer._isCastForAudioDevice = function () {
    var receiverManager = window.cast.receiver.CastReceiverManager.getInstance();
    if ( receiverManager ) {
        var deviceCapabilities = receiverManager.getDeviceCapabilities();
        if ( deviceCapabilities ) {
            return deviceCapabilities[ 'display_supported' ] === false;
        }
    }
    return false;
};

/**
 * Causes the given element to fade out.
 *
 * @param {!Element} element The element to fade out.
 * @param {number} time The amount of time (in seconds) to transition.
 * @param {function()=} opt_doneFunc The function to call when complete.
 * @private
 */
CastPlayer._fadeOut = function ( element, time, opt_doneFunc ) {
    CastPlayer._fadeTo( element, 0, time, opt_doneFunc );
};

/**
 * Causes the given element to fade in.
 *
 * @param {!Element} element The element to fade in.
 * @param {number} time The amount of time (in seconds) to transition.
 * @param {function()=} opt_doneFunc The function to call when complete.
 * @private
 */
CastPlayer._fadeIn = function ( element, time, opt_doneFunc ) {
    CastPlayer._fadeTo( element, '', time, opt_doneFunc );
};

/**
 * Causes the given element to fade to the given opacity in the given
 * amount of time.
 *
 * @param {!Element} element The element to fade in/out.
 * @param {string|number} opacity The opacity to transition to.
 * @param {number} time The amount of time (in seconds) to transition.
 * @param {function()=} opt_doneFunc The function to call when complete.
 * @private
 */
CastPlayer._fadeTo = function ( element, opacity, time, opt_doneFunc ) {
    var _this = this;
    var id = Date.now();
    var listener = function () {
        element.style.webkitTransition = '';
        element.removeEventListener( 'webkitTransitionEnd', listener, false );
        if ( opt_doneFunc ) {
            opt_doneFunc();
        }
    };
    element.addEventListener( 'webkitTransitionEnd', listener, false );
    element.style.webkitTransition = 'opacity ' + time + 's';
    element.style.opacity = opacity;
};

/**
 * Updates the application state if it has changed.
 *
 * @private
 */
CastPlayer.prototype._updateApplicationState = function () {
    //this.log_('updateApplicationState_');
    if ( this._mediaManager ) {
        var idle = this.state_ === CastPlayer.State.IDLE;
        var media = idle ? null : this._mediaManager.getMediaInformation();
        var applicationState = CastPlayer._getApplicationState( media );
        if ( this._currentApplicationState != applicationState ) {
            this._currentApplicationState = applicationState;
            this._receiverManager.setApplicationState( applicationState );
        }
    }
};

/**
 * Called when the player is ready. We initialize the UI for the launching
 * and idle screens.
 *
 * @private
 */
CastPlayer.prototype._onReady = function () {
    this._setState( CastPlayer.State.IDLE, false );
};

/**
 * Called when a sender disconnects from the app.
 *
 * @param {cast.receiver.CastReceiverManager.SenderDisconnectedEvent} event
 * @private
 */
CastPlayer.prototype._onSenderDisconnected = function ( event ) {
    // When the last or only sender is connected to a receiver,
    // tapping Disconnect stops the app running on the receiver.
    if ( this._receiverManager.getSenders().length === 0 && event.reason === cast.receiver.system.DisconnectReason.REQUESTED_BY_SENDER ) {
        this._receiverManager.stop();
    }
};

/**
 * Lets player handle autoplay, instead of depending on underlying
 * MediaElement to handle it. By this way, we can make sure that media playback
 * starts after loading screen is displayed.
 *
 * @param {!cast.receiver.MediaManager.LoadInfo} info The load request info.
 * @private
 */
CastPlayer.prototype._letPlayerHandleAutoPlay = function ( info ) {
    var autoplay = info.message.autoplay;
    info.message.autoplay = false;
    this._mediaElement.autoplay = false;
    this._playerAutoPlay = (autoplay == undefined) ? true : autoplay;
};

/**
 * Loads some video content.
 *
 * @param {!cast.receiver.MediaManager.LoadInfo} info The load request info.
 * @return {boolean} Whether the media was preloaded
 * @private
 */
CastPlayer.prototype._loadVideo = function ( info ) {
    debugger;
    var _this = this;
    var protocolFunc = null;
    var url = info.message.media.contentId;
    var protocolFunc = CastPlayer._getProtocolFunction( info.message.media );
    var wasPreloaded = false;

    this._letPlayerHandleAutoPlay( info );
    if ( !protocolFunc ) {
        this._mediaElement.addEventListener( 'stalled', this._bufferingHandler, false );
        this._mediaElement.addEventListener( 'waiting', this._bufferingHandler, false );
    } else {
        // When MPL is used, buffering status should be detected by
        // getState()['underflow]'
        this._mediaElement.removeEventListener( 'stalled', this._bufferingHandler );
        this._mediaElement.removeEventListener( 'waiting', this._bufferingHandler );

        // If we have not preloaded or the content preloaded does not match the
        // content that needs to be loaded, perform a full load
        var loadErrorCallback = function () {
            // unload player and trigger error event on media element
            if ( _this._player ) {
                _this._resetMediaElement();
                _this._mediaElement.dispatchEvent( new Event( 'error' ) );
            }
        };
        if ( !this._preloadPlayer || (this._preloadPlayer.getHost && this._preloadPlayer.getHost().url != url) ) {
            if ( this._preloadPlayer ) {
                this._preloadPlayer.unload();
                this._preloadPlayer = null;
            }
            var host = new cast.player.api.Host( {
                'url': url,
                'mediaElement': this._mediaElement
            } );
            host.onError = loadErrorCallback;
            this._player = new cast.player.api.Player( host );
            this._player.load( protocolFunc( host ) );
        } else {
            this._player = this._preloadPlayer;
            this._preloadPlayer = null;
            // Replace the "preload" error callback with the "load" error callback
            this._player.getHost().onError = loadErrorCallback;
            this._player.load();
            wasPreloaded = true;
        }
    }
    // this.loadMediaManagerInfo_( info, !!protocolFunc );
    return wasPreloaded;
};

/**
 * Cancels deferred playback.
 *
 * @param {string} cancelReason
 * @private
 */
CastPlayer.prototype._cancelDeferredPlay = function ( cancelReason ) {
    if ( this._deferredPlayCallbackId ) {
        clearTimeout( this._deferredPlayCallbackId );
        this._deferredPlayCallbackId = null;
    }
};

/**
 * Returns the application state.
 *
 * @param {cast.receiver.media.MediaInformation=} mediaInfo The current media
 *     metadata
 * @return {string} The application state.
 * @private
 */
CastPlayer._getApplicationState = function ( mediaInfo ) {
    if ( mediaInfo && mediaInfo.metadata && mediaInfo.metadata.title ) {
        return 'Now Casting: ' + media.metadata.title;
    } else if ( mediaInfo ) {
        return 'Now Casting';
    } else {
        return 'Ready To Cast';
    }
};

/**
 * Returns the type of player to use for the given media.
 * By default this looks at the media's content type, but falls back
 * to file extension if not set.
 *
 * @param {!cast.receiver.media.MediaInformation} media The media.
 * @return {CastPlayer.Type} The player type.
 * @private
 */
CastPlayer._getType = function ( media ) {
    var contentId = media.contentId || '';
    var contentType = media.contentType || '';
    var contentUrlPath = this._getPath( contentId );






    if ( contentType.indexOf( 'audio/' ) === 0 ) {
        return this.Type.AUDIO;
    } else if ( contentType.indexOf( 'video/' ) === 0 ) {
        return this.Type.VIDEO;
    } else if ( contentType.indexOf( 'application/x-mpegurl' ) === 0 ) {
        return this.Type.VIDEO;
    } else if ( contentType.indexOf( 'application/vnd.apple.mpegurl' ) === 0 ) {
        return this.Type.VIDEO;
    } else if ( contentType.indexOf( 'application/dash+xml' ) === 0 ) {
        return this.Type.VIDEO;
    } else if ( contentType.indexOf( 'application/vnd.ms-sstr+xml' ) === 0 ) {
        return this.Type.VIDEO;
    } else if ( this._getExtension( contentUrlPath ) === 'mp3' ) {
        return this.Type.AUDIO;
    } else if ( this._getExtension( contentUrlPath ) === 'oga' ) {
        return this.Type.AUDIO;
    } else if ( this._getExtension( contentUrlPath ) === 'wav' ) {
        return this.Type.AUDIO;
    } else if ( this._getExtension( contentUrlPath ) === 'mp4' ) {
        return this.Type.VIDEO;
    } else if ( this._getExtension( contentUrlPath ) === 'ogv' ) {
        return this.Type.VIDEO;
    } else if ( this._getExtension( contentUrlPath ) === 'webm' ) {
        return this.Type.VIDEO;
    } else if ( this._getExtension( contentUrlPath ) === 'm3u8' ) {
        return this.Type.VIDEO;
    } else if ( this._getExtension( contentUrlPath ) === 'mpd' ) {
        return this.Type.VIDEO;
    } else if ( contentType.indexOf( '.ism' ) != 0 ) {
        return this.Type.VIDEO;
    }
    return this.Type.UNKNOWN;
};

/**
 * Gets the adaptive streaming protocol creation function based on the media
 * information.
 *
 * @param {!cast.receiver.media.MediaInformation} mediaInformation The
 *     asset media information.
 * @return {?function(cast.player.api.Host):player.StreamingProtocol}
 *     The protocol function that corresponds to this media type.
 * @private
 */
CastPlayer._getProtocolFunction = function ( mediaInformation ) {
    var url = mediaInformation.contentId;
    var type = mediaInformation.contentType || '';
    var path = this._getPath( url ) || '';
    if ( this._getExtension( path ) === 'm3u8' || type === 'application/x-mpegurl' || type === 'application/vnd.apple.mpegurl' ) {
        return cast.player.api.CreateHlsStreamingProtocol;
    } else if ( this._getExtension( path ) === 'mpd' || type === 'application/dash+xml' ) {
        return cast.player.api.CreateDashStreamingProtocol;
    } else if ( path.indexOf( '.ism' ) > -1 || type === 'application/vnd.ms-sstr+xml' ) {
        return cast.player.api.CreateSmoothStreamingProtocol;
    }
    return null;
};

/**
 * Utility function to get the extension of a URL file path.
 *
 * @param {string} url the URL
 * @return {string} the extension or "" if none
 * @private
 */
CastPlayer._getExtension = function ( url ) {
    var parts = url.split( '.' );
    // Handle files with no extensions and hidden files with no extension
    if ( parts.length === 1 || (parts[ 0 ] === '' && parts.length === 2) ) {
        return '';
    }
    return parts.pop().toLowerCase();
};

/**
 * Returns the URL path.
 *
 * @param {string} url The URL
 * @return {string} The URL path.
 * @private
 */
CastPlayer._getPath = function ( url ) {
    var href = document.createElement( 'a' );
    href.href = url;
    return href.pathname || '';
};

/**
 * Called when media is buffering. If we were previously playing,
 * transition to the BUFFERING state.
 *
 * @private
 */
CastPlayer.prototype._onBuffering = function () {
    //this.log_('onBuffering[readyState=' + this.mediaElement_.readyState + ']');
    if ( this._state === CastPlayer.State.PLAYING && this._mediaElement.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA ) {
        this._setState( CastPlayer.State.BUFFERING, false );
    }
};

/**
 * Called when media has an error. Transitions to IDLE state and
 * calls to the original media manager implementation.
 *
 * @see cast.receiver.MediaManager#onError
 * @param {!Object} error
 * @private
 */
CastPlayer.prototype._onError = function ( error ) {
    //this.log_('onError');
    var _this = this;
    CastPlayer._transition( _this._element, CastPlayer._TRANSITION_DURATION, function () {
        _this._setState( CastPlayer.State.IDLE, true );
        _this._onErrorOrig( error );
    } );
};


/**
 * Called when media has started playing. We transition to the
 * PLAYING state.
 *
 * @private
 */
CastPlayer.prototype._onPlaying = function () {
    //this.log_( 'onPlaying' );
    this._cancelDeferredPlay( 'media is already playing' );
    var isAudio = this._type == CastPlayer.Type.AUDIO;
    var isLoading = this._state == CastPlayer.State.LOADING;
    var crossfade = isLoading && !isAudio;
    this._setState( CastPlayer.State.PLAYING, crossfade );
};


/**
 * Called when media has been paused. If this is an auto-pause as a result of
 * buffer underflow, we transition to BUFFERING state; otherwise, if the media
 * isn't done, we transition to the PAUSED state.
 *
 * @private
 */
CastPlayer.prototype._onPause = function () {
    //this.log_( 'onPause' );
    this._cancelDeferredPlay( 'media is paused' );
    var isIdle = this._state === CastPlayer.State.IDLE;
    var isDone = this._mediaElement.currentTime === this._mediaElement.duration;
    var isUnderflow = this._player && this._player.getState()[ 'underflow' ];
    if ( isUnderflow ) {
        //this.log_( 'isUnderflow' );
        this._setState( CastPlayer.State.BUFFERING, false );
        this._mediaManager.broadcastStatus( false );
    } else if ( !isIdle && !isDone ) {
        this._setState( CastPlayer.State.PAUSED, false );
    }
    this._updateProgress();
};

/**
 * Updates the current time and progress bar elements.
 *
 * @private
 */
CastPlayer.prototype._updateProgress = function () {
    // Update the time and the progress bar
    if ( !CastPlayer._isCastForAudioDevice() ) {
        var curTime = this._mediaElement.currentTime;
        var totalTime = this._mediaElement.duration;
        if ( !isNaN( curTime ) && !isNaN( totalTime ) ) {
            var pct = 100 * (curTime / totalTime);
            this._curTimeElement.innerText = CastPlayer._formatDuration( curTime );
            this._totalTimeElement.innerText = CastPlayer._formatDuration( totalTime );
            this._progressBarInnerElement.style.width = pct + '%';
            this._progressBarThumbElement.style.left = pct + '%';
            // Handle preview mode
            if ( this._displayPreviewMode ) {
                this._previewModeTimerElement.innerText = "" + Math.round( totalTime - curTime );
            }
        }
    }
};

/**
 * Formats the given duration.
 *
 * @param {number} dur the duration (in seconds)
 * @return {string} the time (in HH:MM:SS)
 * @private
 */
CastPlayer._formatDuration = function ( dur ) {
    dur = Math.floor( dur );
    function digit( n ) {
        return ('00' + Math.round( n )).slice( -2 );
    }

    var hr = Math.floor( dur / 3600 );
    var min = Math.floor( dur / 60 ) % 60;
    var sec = dur % 60;
    if ( !hr ) {
        return digit( min ) + ':' + digit( sec );
    } else {
        return digit( hr ) + ':' + digit( min ) + ':' + digit( sec );
    }
};

/**
 * Called when media has ended. We transition to the IDLE state.
 *
 * @private
 */
CastPlayer.prototype._onEnded = function () {
    //this.log_('onEnded');
    this._setState( CastPlayer.State.IDLE, true );
    this._hidePreviewMode();
};

/**
 * Hide the preview mode UI.
 *
 * @private
 */
CastPlayer.prototype._hidePreviewMode = function () {
    this.showPreviewModeMetadata( false );
    this._displayPreviewMode = false;
};

/**
 * Display preview mode metadata.
 *
 * @param {boolean} show whether player is showing preview mode metadata
 * @export
 */
CastPlayer.prototype.showPreviewModeMetadata = function ( show ) {
    this._element.setAttribute( 'preview-mode', show.toString() );
};

/**
 * Called when media has been aborted. We transition to the IDLE state.
 *
 * @private
 */
CastPlayer.prototype._onAbort = function () {
    //this.log_('onAbort');
    this._setState( CastPlayer.State.IDLE, true );
    this._hidePreviewMode();
};

/**
 * Hide the preview mode UI.
 *
 * @private
 */
CastPlayer.prototype._hidePreviewMode = function () {
    this.showPreviewModeMetadata( false );
    this._displayPreviewMode = false;
};

/**
 * Called periodically during playback, to notify changes in playback position.
 * We transition to PLAYING state, if we were in BUFFERING or LOADING state.
 *
 * @private
 */
CastPlayer.prototype._onProgress = function () {
    // if we were previously buffering, update state to playing
    if ( this._state === CastPlayer.State.BUFFERING || this._state === CastPlayer.State.LOADING ) {
        this._setState( CastPlayer.State.PLAYING, false );
    }
    this._updateProgress();
};

/**
 * Callback called when user starts seeking
 *
 * @private
 */
CastPlayer.prototype._onSeekStart = function () {
    //this.log_('onSeekStart');
    clearTimeout( this._seekingTimeoutId );
    this._element.classList.add( 'seeking' );
};


/**
 * Callback called when user stops seeking.
 *
 * @private
 */
CastPlayer.prototype._onSeekEnd = function () {
    //this.log_('onSeekEnd');
    clearTimeout( this._seekingTimeoutId );
    this._seekingTimeoutId = CastPlayer._addClassWithTimeout( this._element, 'seeking', 3000 );
};

/**
 * Adds the given className to the given element for the specified amount of
 * time.
 *
 * @param {!Element} element The element to add the given class.
 * @param {string} className The class name to add to the given element.
 * @param {number} timeout The amount of time (in ms) the class should be
 *     added to the given element.
 * @return {number} A numerical id, which can be used later with
 *     window.clearTimeout().
 * @private
 */
CastPlayer._addClassWithTimeout = function ( element, className, timeout ) {
    element.classList.add( className );
    return setTimeout( function () {
        element.classList.remove( className );
    }, timeout );
};
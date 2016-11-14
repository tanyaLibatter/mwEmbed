/**
 * Embed player constructor.
 * @struct
 * @constructor
 * @export
 */
function EmbedPlayer() {
    this._componentName = "EmbedPlayer";
    this._embedPlayerInitialized = false;
    this._customMessages = {};
}

/**
 *
 * @param
 * @public
 */
EmbedPlayer.prototype.onMessage = function ( event ) {
    if ( event && event.data ) {
        var payload = JSON.parse( event.data );
        var method = payload.type;
        this._customMessages[ method ]( payload );
    }
};

/**
 *
 * @param
 * @public
 */
EmbedPlayer.prototype.Embed = function ( event ) {
    var _this = this;
    var embedData = event.data.customData;

    if ( !this._embedPlayerInitialized ) {
        var scriptTag = document.createElement( "script" );
        scriptTag.type = "text/javascript";
        scriptTag.src = embedData.lib + "mwEmbedLoader.php";
        document.head.appendChild( scriptTag );

        var intervalID = setInterval( function () {
            if ( typeof mw !== "undefined" ) {
                clearInterval( intervalID );
                var publisherID = embedData.publisherID;
                var uiConfID = embedData.uiconfID;
                var entryID = embedData.entryID;
                var fv = _this._getFlashVars( embedData );
                _this._setConfiguration( embedData );
                kWidget.embed( {
                    "targetId": "kaltura_player",
                    "wid": "_" + publisherID,
                    "uiconf_id": uiConfID,
                    "readyCallback": _this._onReady.bind( _this, [ event ] ),
                    "flashvars": fv,
                    "cache_st": 1438601385,
                    "entry_id": entryID
                } );
            }
        }, 100 );
    }
};

/**
 *
 * @param
 * @private
 */
EmbedPlayer.prototype._onReady = function ( event, playerID ) {
    debugger;
    if ( !this._embedPlayerInitialized ) {
        this._embedPlayerInitialized = true;
        kdp = document.getElementById( playerID );
        kdp.kBind( "broadcastToSender", this._broadcastToSender.bind( this ) );
        kdp.kBind( "SourceSelected", this._onSourceSelected.bind( this, [ event ] ) );
    }
};

/**
 *
 * @param
 * @private
 */
EmbedPlayer.prototype._onSourceSelected = function ( event, sourceObj ) {
    if ( event && event[ 0 ] && event[ 0 ][ 0 ] ) {
        event = event[ 0 ][ 0 ];
        event.data.media.contentId = sourceObj.src;
        event.data.media.contentType = sourceObj.mimeType;
        remotePlayer.CastPlayer.load( new cast.receiver.MediaManager.LoadInfo( event.data, event.senderId ) );
    }
};

/**
 *
 * @param
 * @private
 */
EmbedPlayer.prototype._setConfiguration = function ( embedData ) {
    mw.setConfig( "EmbedPlayer.HidePosterOnStart", true );
    if ( embedData.debugKalturaPlayer == true ) {
        mw.setConfig( "debug", true );
        mw.setConfig( "debugTarget", "kdebug" );
        mw.setConfig( "autoScrollDebugTarget", true );
        document.getElementById( 'kdebug' ).style.display = 'block';
    }
    mw.setConfig( "chromecastReceiver", true );
    mw.setConfig( "Kaltura.ExcludedModules", "chromecast" );
};

/**
 *
 * @param
 * @private
 */
EmbedPlayer.prototype._getFlashVars = function ( embedData ) {
    return this._extend( {
        "dash": {
            'plugin': false
        },
        "multiDrm": {
            'plugin': false
        },
        "embedPlayerChromecastReceiver": {
            'plugin': true
        },
        "chromecast": {
            'plugin': false
        },
        "playlistAPI": {
            'plugin': false
        }
    }, embedData.flashVars );
};

/**
 *
 * @param
 * @private
 */
EmbedPlayer.prototype._broadcastToSender = function ( msg ) {
    if ( msg ) {
        remotePlayer.MediaPlayer.broadcast( msg );
    }
};

/**
 *
 * @param
 * @private
 */
EmbedPlayer.prototype._extend = function ( a, b ) {
    for ( var key in b )
        if ( b.hasOwnProperty( key ) )
            a[ key ] = b[ key ];
    return a;
};
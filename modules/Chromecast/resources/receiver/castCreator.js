var CastReceiverVars = {
    receiverManager: null,
    mediaManager: null,
    messageBus: null,
    mediaInfo: null
};

onload = function () {
    var _embedPlayerInitialized = false;

    CastReceiverVars.receiverManager = cast.receiver.CastReceiverManager.getInstance();
    CastReceiverVars.mediaManager = new cast.receiver.MediaManager( document.getElementById( 'tempMedia' ) );
    CastReceiverVars.mediaManager.onLoad = onFirstMediaLoadRequest.bind( this );
    CastReceiverVars.messageBus = CastReceiverVars.receiverManager.getCastMessageBus( 'urn:x-cast:com.kaltura.cast.player' );
    CastReceiverVars.receiverManager.start();

    function onFirstMediaLoadRequest( event ) {
        debugger;
        var _this = this;
        if ( event && event.data ) {
            CastReceiverVars.mediaInfo = event.data;
            var embedInfo = event.data.media.customData;
            if ( !_embedPlayerInitialized ) {
                var scriptTag = document.createElement( "script" );
                scriptTag.type = "text/javascript";
                scriptTag.src = embedInfo.lib + "mwEmbedLoader.php";
                document.head.appendChild( scriptTag );

                var intervalID = setInterval( function () {
                    if ( typeof mw !== "undefined" ) {
                        clearInterval( intervalID );
                        setConfiguration( embedInfo );
                        kWidget.embed( {
                            "targetId": "kaltura_player",
                            "wid": "_" + embedInfo.publisherID,
                            "uiconf_id": embedInfo.uiconfID,
                            "readyCallback": onEmbedPlayerReady.bind( _this ),
                            "flashvars": getFlashVars( embedInfo ),
                            "cache_st": 1438601385,
                            "entry_id": embedInfo.entryID
                        } );
                    }
                }, 100 );
            }
        }
    }

    function onEmbedPlayerReady( playerId ) {
        $( "#tempMedia" ).remove();
    }

    function getFlashVars( embedInfo ) {
        return extend( {
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
        }, embedInfo.flashVars );
    }

    function setConfiguration( embedInfo ) {
        mw.setConfig( "EmbedPlayer.HidePosterOnStart", true );
        if ( embedInfo.debugKalturaPlayer == true ) {
            mw.setConfig( "debug", true );
            mw.setConfig( "debugTarget", "kdebug" );
            mw.setConfig( "autoScrollDebugTarget", true );
            document.getElementById( 'kdebug' ).style.display = 'block';
        }
        mw.setConfig( "chromecastReceiver", true );
        mw.setConfig( "Kaltura.ExcludedModules", "chromecast" );
    }

    function extend( a, b ) {
        for ( var key in b )
            if ( b.hasOwnProperty( key ) )
                a[ key ] = b[ key ];
        return a;
    }
};


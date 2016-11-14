/**
 * Creates the namespace
 */
var remotePlayer = remotePlayer || {};

/**
 * Loads and creates new instance of the remote player.
 */
onload = function () {
    setTimeout( function () {
        remotePlayer = new RemotePlayer();
        // Creating the embed player component
        remotePlayer.EmbedPlayer = new EmbedPlayer();
        // Creating the cast player component
        var playerDiv = document.getElementById( 'videoHolder' );
        remotePlayer.CastPlayer = new CastPlayer( playerDiv );
        // Starting the session
        remotePlayer.CastPlayer.start();
    }, 5000 );
};

/**
 * Remote player constructor.
 * @struct
 * @constructor
 * @export
 */
function RemotePlayer() {
    this._componentName = "remotePlayer";
}

/**
 * Called when we receive a LOAD message. Calls load().
 * If the event contains custom data of embed type, call load() from a different flow.
 * @param {cast.receiver.MediaManager.Event} event The load event.
 * @private
 */
RemotePlayer.prototype._onLoad = function ( event ) {
    if ( event && event.data ) {
        var customData = event.data.customData;
        if ( customData && customData.type === 'embed' ) {
            remotePlayer.EmbedPlayer.Embed( event );
        }
        else {
            remotePlayer.CastPlayer.load( new cast.receiver.MediaManager.LoadInfo( event.data, event.senderId ) );
        }
    }
};

/**
 *
 * @param
 * @public
 */
RemotePlayer.prototype.log = function ( componentName, methodName, data ) {
    console.log( "[Cast Receiver] " +
        "[" + this._getCurrentTime() + "] " +
        "[COMPONENT: " + componentName + "] " +
        "[METHOD: " + methodName + "]  " +
        "[DATA: " + JSON.stringify( data ) + "] " );
};

/**
 *
 * @param
 * @private
 */
RemotePlayer.prototype._getCurrentTime = function () {
    var myDate = new Date();
    return myDate.getHours() + ":" + myDate.getMinutes() + ":" + myDate.getSeconds() + ":" + myDate.getMilliseconds();
};

/**
 *
 * @param
 * @private
 */
RemotePlayer.prototype._getComponentName = function () {
    return this._componentName;
};
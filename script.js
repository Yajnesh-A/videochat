//#1
let client = AgoraRTC.createClient({ mode: 'rtc', codec: "vp8" })

//#2
let config = {
    appid: "442326b3fd2843b490008f28c9a9182f",
    token: "007eJxTYNCfFygie/Eaw9VXpzg1I9xe7y6qNne96fNo4kvhyae1G58pMJiYGBkbmSUZp6UYWZgYJ5lYGhgYWKQZWSRbJloaWhilzZkfkdIQyMgQ+12alZEBAkF8FobcxMw8BgYAKSoe4g==",
    uid: null,
    channel: "main",
}

//#3 - Setting tracks for when user joins
let localTracks = {
    audioTrack: null,
    videoTrack: null
}

//#4 - Want to hold state for users audio and video so user can mute and hide
let localTrackState = {
    audioTrackMuted: false,
    videoTrackMuted: false
}

//#5 - Set remote tracks to store other users
let remoteTracks = {}


document.getElementById('join-btn').addEventListener('click', async () => {
    config.uid = document.getElementById('username').value
    await joinStreams()
    document.getElementById('join-wrapper').style.display = 'none'
    document.getElementById('footer').style.display = 'flex'
})

document.getElementById('mic-btn').addEventListener('click', async () => {
    //Check if what the state of muted currently is
    //Disable button
    if (!localTrackState.audioTrackMuted) {
        //Mute your audio
        await localTracks.audioTrack.setMuted(true);
        localTrackState.audioTrackMuted = true
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(255, 80, 80, 0.7)'
    } else {
        await localTracks.audioTrack.setMuted(false)
        localTrackState.audioTrackMuted = false
        document.getElementById('mic-btn').style.backgroundColor = '#1f1f1f8e'

    }

})



document.getElementById('camera-btn').addEventListener('click', async () => {
    //Check if what the state of muted currently is
    //Disable button
    if (!localTrackState.videoTrackMuted) {
        //Mute your audio
        await localTracks.videoTrack.setMuted(true);
        localTrackState.videoTrackMuted = true
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(255, 80, 80, 0.7)'
    } else {
        await localTracks.videoTrack.setMuted(false)
        localTrackState.videoTrackMuted = false
        document.getElementById('camera-btn').style.backgroundColor = '#1f1f1f8e'

    }

})


document.getElementById('share-screen-btn').addEventListener('click', async () => {

    // Generate a local screen video track
    var screenVideoTrack;

    // Request permission to capture the screen
    navigator.mediaDevices.getDisplayMedia({ video: true })
        .then(function (screenStream) {
            // Create an AgoraRTC video track from the screen stream
            screenVideoTrack = AgoraRTC.createTrack(screenStream.getVideoTracks()[0]);

            // Initialize the AgoraRTC client
            client.init(config.appid, function () {
                // Join a channel
                client.join(config.token, config.channel, null, function (uid) {
                    // Publish the screen video track
                    client.publish(screenVideoTrack, function (err) {
                        if (err) {
                            console.error('Failed to publish screen video track:', err);
                        } else {
                            console.log('Screen video track published successfully');
                        }
                    });
                });
            });
        })
        .catch(function (error) {
            console.error('Failed to capture the screen:', error);
        });

})

//Use this methd when a participant joins the meeting
document.getElementById('mute-all-btn').addEventListener('click', async () => {

    // Get a list of participants
    client.on('stream-published', () => {
        const participants = client.getParticipantsInfo();
        console.log("participants-------", participants)

        // Loop through participants and mute them
        // participants.forEach((participant) => {
        // muteParticipant(participant.uid);
        // });
    });

})


document.getElementById('leave-btn').addEventListener('click', async () => {
    //Loop threw local tracks and stop them so unpublish event gets triggered, then set to undefined
    //Hide footer
    for (trackName in localTracks) {
        let track = localTracks[trackName]
        if (track) {
            track.stop()
            track.close()
            localTracks[trackName] = null
        }
    }

    //Leave the channel
    await client.leave()
    document.getElementById('footer').style.display = 'none'
    document.getElementById('user-streams').innerHTML = ''
    document.getElementById('join-wrapper').style.display = 'block'

})




//Method will take all my info and set user stream in frame
let joinStreams = async () => {
    //Is this place hear strategicly or can I add to end of method?

    client.on("user-published", handleUserJoined);
    client.on("user-left", handleUserLeft);


    client.enableAudioVolumeIndicator(); // Triggers the "volume-indicator" callback event every two seconds.
    client.on("volume-indicator", function (evt) {
        for (let i = 0; evt.length > i; i++) {
            let speaker = evt[i].uid
            let volume = evt[i].level
            if (volume > 0) {
                document.getElementById(`volume-${speaker}`).src = './assets/volume-on.svg'
            } else {
                document.getElementById(`volume-${speaker}`).src = './assets/volume-off.svg'
            }



        }
    });

    //#6 - Set and get back tracks for local user
    [config.uid, localTracks.audioTrack, localTracks.videoTrack] = await Promise.all([
        client.join(config.appid, config.channel, config.token || null, config.uid || null),
        AgoraRTC.createMicrophoneAudioTrack(),
        AgoraRTC.createCameraVideoTrack()

    ])

    //#7 - Create player and add it to player list
    let player = `<div class="video-containers" id="video-wrapper-${config.uid}">
                        <p class="user-uid"><img class="volume-icon" id="volume-${config.uid}" src="./assets/volume-on.svg" /> ${config.uid}</p>
                        <div class="video-player player" id="stream-${config.uid}"></div>
                  </div>`

    document.getElementById('user-streams').insertAdjacentHTML('beforeend', player);
    //#8 - Player user stream in div
    localTracks.videoTrack.play(`stream-${config.uid}`)


    //#9 Add user to user list of names/ids

    //#10 - Publish my local video tracks to entire channel so everyone can see it
    await client.publish([localTracks.audioTrack, localTracks.videoTrack])

}


let handleUserJoined = async (user, mediaType) => {
    console.log('Handle user joined')

    //#11 - Add user to list of remote users
    remoteTracks[user.uid] = user

    //#12 Subscribe ro remote users
    await client.subscribe(user, mediaType)


    if (mediaType === 'video') {
        let player = document.getElementById(`video-wrapper-${user.uid}`)
        console.log('player:', player)
        if (player != null) {
            player.remove()
        }

        player = `<div class="video-containers" id="video-wrapper-${user.uid}">
                        <p class="user-uid"><img class="volume-icon" id="volume-${user.uid}" src="./assets/volume-on.svg" /> ${user.uid}</p>
                        <div  class="video-player player" id="stream-${user.uid}"></div>
                      </div>`
        document.getElementById('user-streams').insertAdjacentHTML('beforeend', player);
        user.videoTrack.play(`stream-${user.uid}`)




    }


    if (mediaType === 'audio') {
        user.audioTrack.play();
    }
}


let handleUserLeft = (user) => {
    console.log('Handle user left!')
    //Remove from remote users and remove users video wrapper
    delete remoteTracks[user.uid]
    document.getElementById(`video-wrapper-${user.uid}`).remove()
}


enyo.kind({
	name: "VoicemailView",
	kind: "VFlexBox",
	published: {
		message: "",
		messageId: "",
	},
	components: [
        { name: "newPlayVoicemail", kind: "PalmService", service: "palm://com.ericblade.synergv.service/",
			method: "httpsRequest", onFailure: "voicemailFailed", onSuccess: "voicemailDownloaded" },		
		{ name: "SoundPlayer", kind: "enyo.Sound" },
		{ kind: "Spacer" },
		{ kind: "VFlexBox", style: "padding-bottom: 10px;", components:
			[
				{ name: "ProgressSlider", kind: "ProgressSlider", barMinimum: 0, barMaximum: 0,
					barPosition: 0, altBarPosition: 0, position: 0, onChange: "progressSliderChange",
					style: "padding-left: 8px; padding-right: 8px;"
				},
				{ kind: "HFlexBox", components:
					[
						{ content: "0:00", className: "enyo-item-ternary", pack: "center" },
						{ kind: "Spacer", },
						{ name: "MediaLengthLabel", content: "5:43", pack: "center", className: "enyo-item-ternary" },
					]
				}
			]
		},
		{ kind: "Toolbar", components:
			[
				{ name: "PlayPauseButton", icon: "images/play.png", onclick: "playPauseClicked" },
				// TODO: bring up an editor, after complete offer a "Save Transcription" and a "Save & Donate" option
				// Save calls setMessageFlag saveTranscript, save & donate calls that and setMessageFlag donate
				{ name: "EditTranscriptButton", disabled: true, caption: "Edit Transcription" },				
				//{ name: "DonateButton", caption: "Donate" },
				// TODO: bring up an input box for entering email addresses, as well as a button to bring up People Picker
				// should have a checkbox to include a link to the MP3, as well as edit a message subject and body
				// all this done with client.set('forward', ...) (setMessageFlag)
				{ name: "ForwardButton", disabled: true, caption: "Forward" },
			]
		},
	],
	playPauseClicked: function(inSender, inEvent) {
		this.log("playPause", this.message.id);

		if(!this.pausedAudio && !this.playingAudio) {
			this.downloading = true;
			this.log("Playing for first time, downloading...");
			enyo.scrim.show();
			this.$.newPlayVoicemail.call({
				host: "www.google.com",
				path: "/voice/b/0/media/send_voicemail/" + encodeURI(this.message.id),
				method: "GET",
				headers: {
					"Authorization":"GoogleLogin auth=" + enyo.application.authCode
				},
				savefile: "/media/internal/.synergv/"+this.message.id+".mp3",
				binary: true
			});
			this.pausedAudio = false;
		} else {
			this.pausedAudio = !this.pausedAudio;
		}
		this.playingAudio = true;
		this.$.PlayPauseButton.setIcon( (this.playingAudio && !this.pausedAudio) ? "images/pause.png" : "images/play.png");
		if(this.pausedAudio)
		{
		    this.$.SoundPlayer.audio.pause();
			clearInterval(this.playerInterval);
		}
		else if(!this.downloading)
		{
			this.$.SoundPlayer.audio.play();
			this.playerInterval = setInterval(enyo.bind(this, this.playerTimer), 500); 
		}
	},
	playerTimer: function() {
        var state;
        var player = this.$.SoundPlayer;
        var node = player && player.audio;
        if(!player)
            return;
        if(node) {
            switch(node.readyState)
            {
                case 0:
                    state = "NO DATA LOADED";
                    break;
                case 1:
                    state = "HAVE METADATA";
                    break;
                case 2:
                    state = "HAVE CURRENT DATA";
                    break;
                case 3:
                    state = "HAVE FUTURE DATA";
                    break;
                case 4:
                    state = "HAVE ENOUGH DATA";
                    break;
            }
            try {
                this.$.ProgressSlider.setAltBarPosition(parseInt( (node.buffered.end(0) / node.duration) * 100));
            } catch(err) {
                // we need a catch here because this throws a DOM ERROR 1 if it's called too early.. why? who the fuck knows..
            }
        } else {
			// what to do here, hmm..
        }
		var duration = (this.message && this.message.duration) || (player.audio.duration);
		if(duration)
		    this.$.MediaLengthLabel.setContent("0:" + Math.floor(duration)); // TODO: we do need to parse this into a real time string
        var prog = (player.audio.currentTime / duration) * 100;
        this.$.ProgressSlider.setBarPosition( prog );
		if(!player.audio || !player.audio.seeking)
            this.$.ProgressSlider.setPosition(prog);
        if(duration < 1)
            duration = Math.floor(this.message.duration)-0.5;
        if(node && node.ended !== undefined && node.ended) {
            this.log("Song Ended by Audio Node telling us this");
            this.endPlayback();
        } else if(!node && Math.ceil(player.audio.currentTime) >= duration) {
            this.log("Song Ended by reported Position > reported Duration");
            this.endPlayback();
        }

	},
	endPlayback: function()
	{
		this.playingAudio = false;
		this.pausedAudio = false;
		this.$.PlayPauseButton.setIcon("images/play.png");
		this.$.SoundPlayer.audio.pause();
		clearInterval(this.playerInterval);
	},
	voicemailDownloaded: function(inSender, inResponse, inRequest) {
		enyo.scrim.hide();
		this.downloading = false;
		this.log("voicemailDownloaded", inResponse.file);
		if(inResponse.file != this.$.SoundPlayer.src) {
			this.$.SoundPlayer.audio.pause();
			this.$.SoundPlayer.setSrc(inResponse.file);
			this.$.SoundPlayer.play();
			this.playerInterval = setInterval(enyo.bind(this, this.playerTimer), 500);
		}
	},
	voicemailFailed: function(inSender, inError, inRequest) {
		enyo.scrim.hide();
		this.log("voicemailFailed", JSON.stringify(inError));
	},
	messageChanged: function() {
		if(this.playerInterval)
		    clearInterval(this.playerInterval);
		this.pausedAudio = false;
		this.playingAudio = false;
		this.$.SoundPlayer.audio.pause();
		this.$.PlayPauseButton.setIcon("images/play.png");
		if(this.message && this.message.duration) {
			this.$.MediaLengthLabel.setContent("0:" + this.message.duration);
		} else {
			this.$.MediaLengthLabel.setContent("unk");
		}
	},
	messageIdChanged: function() {
		this.setMessage({ id: this.messageId });
	}
});

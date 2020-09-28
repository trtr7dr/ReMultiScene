var AudioControlls = {
    init: function (path) {
        this.flag = false;
        this.audio = new Pizzicato.Sound(path, function () {
            $('#mute').css('opacity', 0.5);
        });
        this.audio.loop = true;
        this.distortion = new Pizzicato.Effects.LowPassFilter({
            frequency: 495,
            peak: 12
        });
        this.feedback = false;
    },
    effects: function () {
        if(this.feedback){
            this.feedback = false;
            this.audio.removeEffect(this.distortion);
        }else{
            this.feedback = true;
            this.audio.addEffect(this.distortion);
        }
    },
    pause: function(){
        this.flag = false;
        this.audio.pause();
    },
    play: function(){
        this.flag = true;
        this.audio.play();
    }
};

var audio = false;
$('#mute').click(function () {
    if(audio){
        audio = false;
        AudioControlls.pause();
        $('#sound_img').attr('src', 'assets/meta/multi/unmute.svg');
    }else{
        audio = true;
        AudioControlls.play();
        $('#sound_img').attr('src', 'assets/meta/multi/mute.svg');
    }
});

AudioControlls.init('assets/meta/multi/m/cyberpunk-trailer_by_alchemy-of-sound_preview.mp3');

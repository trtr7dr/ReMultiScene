var AudioControlls = {
    init: function (path) {
        this.flag = false;
        let self = this;
        this.audio = new Pizzicato.Sound(path, function () {
            $('#mute').css('opacity', 0.5);
        });
        this.audio.loop = true;
        self.distortion = new Pizzicato.Effects.Distortion({
            gain: 0
        });
        this.gain = 0;
        this.d = 1;
    },
    effects: function () {
        let self = this;
        $.doTimeout('gains', 30, function () {
            self.audio.removeEffect(self.distortion);
            self.gain += 0.01 * self.d;
            if(self.gain > 0.9){
                self.d = -1;
            }
            if(self.gain <= 0 && self.d === -1){
                self.audio.removeEffect(self.distortion);
                self.gain = 0;
                self.d = 1;
                return false;
            }
            self.distortion = new Pizzicato.Effects.Distortion({
                gain: self.gain
            });
            self.audio.addEffect(self.distortion);
            return true;
        });
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

AudioControlls.init('assets/meta/multi/Fatal-Свобода_внутри_пустоты.mp3');
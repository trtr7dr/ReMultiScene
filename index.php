<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <title>MScene</title>
        <meta name="description" value="MScene">
        <meta name="keywords" valeu="MScene">
        <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
        <link rel="stylesheet" href="meta.css">
        <link rel="stylesheet" href="mmeta.css">
    </head>
    <body style="margin: 0; height: 100vh">

        <div class="resol">
            <div class="form-group sci-fi">
                <div class="selector width-per-item">
                    <div class="selection blue" onclick="res_loc(1)"><img src="assets/1.png" width="48px"></div>
                    <div class="selection yellow" onclick="res_loc(2)"><img src="assets/2.png" width="48px"></div>
                    <div class="selection red" onclick="res_loc(3)"><img src="assets/3.png" width="48px"></div>
                </div>
            </div>
        </div>

        <div id="play">
            <img src="assets/play.png" width="42px">
        </div>
        <div id="mute">
            <img src="assets/unmute.png" id="sound_img" width="42px">
        </div>

        <div id="loader">

            
            <img src="assets/load.gif" id="preload">
            <img src="assets/dis.png" id="dis">

            <div id="container" ></div>
        </div>

        <div class="container">
            <div id="promp">
                <h1>MultiScene</h1>
                <p>
                    <a href="https://gloagent.ru">Gloagent</a>
                <p>

            </div>
        </div>

        <video width="0" height="0" id="v1" autoplay="" muted="" loop="" style="display: none">
            <source src="assets/models/media/old.mp4" type='video/mp4'>
            Тег video не поддерживается вашим браузером. 
        </video>
        <video width="0" height="0" id="v2" autoplay="" muted="" loop="" style="display: none">
            <source src="assets/models/media/vanitas.mp4" type='video/mp4'>
            Тег video не поддерживается вашим браузером. 
        </video>
        
        <video width="0" height="0" id="i1" autoplay="" muted="" loop="" style="display: none">
            <source src="assets/scroll.mp4" type='video/mp4'>
            Тег video не поддерживается вашим браузером. 
        </video>
        
        <video width="0" height="0" id="i2" autoplay="" muted="" loop="" style="display: none">
            <source src="assets/audio.mp4" type='video/mp4'>
            Тег video не поддерживается вашим браузером. 
        </video>
        
        <video width="0" height="0" id="i3" autoplay="" muted="" loop="" style="display: none">
            <source src="assets/click.mp4" type='video/mp4'>
            Тег video не поддерживается вашим браузером. 
        </video>

        
        <video width="0" height="0" id="i4" autoplay="" muted="" loop="" style="display: none">
            <source src="assets/button.mp4" type='video/mp4'>
            Тег video не поддерживается вашим браузером. 
        </video>


        <script type="x-shader/x-vertex" id="vertexshader">

            uniform float amplitude;

            attribute float displacement;

            varying vec3 vNormal;
            varying vec2 vUv;

            void main() {

            vNormal = normal;
            vUv = ( 0.5 + amplitude ) * uv + vec2( amplitude );

            vec3 newPosition = position + amplitude * normal * vec3( displacement );
            gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );

            }

        </script>

        <script id="fragShader" type="shader-code">
            uniform vec2 resolution;// Здесь сначала должны быть объявлены uniform-переменные
            void main() {
            // Теперь можно нормализовать координату
            vec2 pos = gl_FragCoord.xy / resolution.xy;
            // И создать градиент!
            gl_FragColor = vec4(1.0,pos.x,pos.y,1.0);
            }
        </script>

        <script type="x-shader/x-fragment" id="fragmentshader">

            varying vec3 vNormal;
            varying vec2 vUv;

            uniform vec3 color;
            uniform sampler2D colorTexture;

            void main() {

            vec3 light = vec3( 0.5, 0.2, 1.0 );
            light = normalize( light );

            float dProd = dot( vNormal, light ) * 0.5 + 0.5;

            vec4 tcolor = texture2D( colorTexture, vUv );
            vec4 gray = vec4( vec3( tcolor.r * 0.3 + tcolor.g * 0.59 + tcolor.b * 0.11 ), 1.0 );

            gl_FragColor = gray * vec4( vec3( dProd ) * vec3( color ), 1.0 );

            }

        </script>

        <script id="nfShader" type="x-shader/x-fragment">
            precision highp float;

            varying vec2 vUv;
            uniform sampler2D inputImage;
            uniform vec3 neonColor;

            float d;
            uniform float time;
            uniform vec2 resolution;


            float lookup(vec2 p, float dx, float dy)
            {
            vec2 uv = (p.xy + vec2(dx * d, dy * d)) / resolution.xy;
            vec4 c = texture2D(inputImage, uv.xy);

            // return as luma
            return 0.2126*c.r + 0.7152*c.g + 0.0722*c.b;
            //return neonColor.r*c.r + neonColor.g*c.g + neonColor.b*c.b;
            }

            void main()
            {
            d = sin(time * 5.0)*0.5 + 1.5; // offset
            vec2 p = gl_FragCoord.xy;

            float gx = 0.0;
            gx += -1.0 * lookup(p, -1.0, -1.0);
            gx += -2.0 * lookup(p, -1.0,  0.0);
            gx += -1.0 * lookup(p, -1.0,  1.0);
            gx +=  1.0 * lookup(p,  1.0, -1.0);
            gx +=  2.0 * lookup(p,  1.0,  0.0);
            gx +=  1.0 * lookup(p,  1.0,  1.0);

            float gy = 0.0;
            gy += -1.0 * lookup(p, -1.0, -1.0);
            gy += -2.0 * lookup(p,  0.0, -1.0);
            gy += -1.0 * lookup(p,  1.0, -1.0);
            gy +=  1.0 * lookup(p, -1.0,  1.0);
            gy +=  2.0 * lookup(p,  0.0,  1.0);
            gy +=  1.0 * lookup(p,  1.0,  1.0);

            float g = gx*gx + gy*gy;
            float g2 = g * (sin(time) / 2.0 + 0.5);

            vec4 col = texture2D(inputImage, p / resolution.xy);
            col += vec4(0.0, g * 0.5, g2, 1.0);

            gl_FragColor = col;
            }
        </script>
        <script id="nShader" type="x-shader/x-vertex">
            varying vec2 vUv;

            void main() {

            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

            }
        </script>

        
        <script src="js/Pizzicato.min.js"></script>
        
        <script src="js/jquery-3.2.1.min.js"></script>
        <script src="js/jquery.ba-dotimeout.min.js"></script>
        <script src="js/json/mjson.js"></script>
        <script src="js/meta/HTMLControlls.js"></script>
        <script src="js/meta/AudioControlls.js"></script>
        <script src="js/meta/MultiScene.js" type="module"></script>

    </body>
</html>

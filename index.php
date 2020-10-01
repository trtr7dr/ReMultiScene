<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <title>REMULT</title>
        <meta name="description" value="REMULT">
        <meta name="keywords" valeu="REMULT">
        <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
        <link rel="stylesheet" href="meta.css">
        <link rel="stylesheet" href="mmeta.css">
    </head>
    <body style="margin: 0; height: 100vh">

        <div class="resol">
            <div class="form-group sci-fi">
                <div class="selector width-per-item">
                    <div class="selection blue" onclick="res_loc(1)">Low Res</div>
                    <div class="selection yellow" onclick="res_loc(2)">Medium Res</div>
                    <div class="selection red" onclick="res_loc(3)">Hi Res</div>
                </div>
            </div>
        </div>

        <div id="play">
            <img src="assets/meta/multi/play.svg" width="22px">
        </div>
        <div id="mute">
            <img src="assets/meta/multi/unmute.svg" id="sound_img" width="22px">
        </div>
        <div class="mob_help">
            <img src="assets/meta/multi/drag.svg" width="22px">
        </div>

        <div id="loader">

            <div class="controls">

                <div class="incon">
                    <div class="instr">
                        <img src="assets/click.svg" width="20px">
                        Click
                    </div>
                    <div class="instr">
                        <img src="assets/scroll.svg" width="20px">
                        Scroll
                    </div>
                    <div class="instr">
                        <img src="assets/scroll_all.svg" width="20px">
                        Move
                    </div>
                </div>
            </div>

            <img src="assets/meta/multi/load.svg" id="preload">
            <img src="assets/dis.png" id="dis">

            <div id="container" ></div>
        </div>

        <div class="container">
            <div class="col-md-12" id="planes">

            </div>
        </div>

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

        <script src="js/jquery-3.2.1.min.js"></script>
        <script src="js/jquery.ba-dotimeout.min.js"></script>
        <script src="js/Pizzicato.min.js"></script>
        <script src="js/json/mjson.js"></script>
        <script src="js/meta/HTMLControlls.js"></script>
        <script src="js/meta/AudioControlls.js"></script>
        <script src="js/meta/MultiScene.js" type="module"></script>

        <!-- Yandex.Metrika counter -->
        <script type="text/javascript" >
                            (function (m, e, t, r, i, k, a) {
                                m[i] = m[i] || function () {
                                    (m[i].a = m[i].a || []).push(arguments)
                                };
                                m[i].l = 1 * new Date();
                                k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a)
                            })
                                    (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

                            ym(57451759, "init", {
                                clickmap: true,
                                trackLinks: true,
                                accurateTrackBounce: true,
                                webvisor: true
                            });
        </script>
        <noscript><div><img src="https://mc.yandex.ru/watch/57451759" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
        <!-- /Yandex.Metrika counter -->

    </body>
</html>
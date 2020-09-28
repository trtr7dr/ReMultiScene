/*
 * trtr7dr for sacri.ru
 * 
 * three.js / https://threejs.org/
 */

"use strict";
import * as THREE from '../../three/build/three.module.js';
import { TrackballControls } from '../../three/jsm/controls/TrackballControls.js';
import { GLTFLoader } from '../../three/jsm/loaders/GLTFLoader.js';
import { DDSLoader } from '../../three/jsm/loaders/DDSLoader.js';
import { Reflector } from '../../three/jsm/Reflector.js';

import { EffectComposer } from '../../three/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../../three/jsm/postprocessing/RenderPass.js';
import { GlitchPass } from '../../three/jsm/postprocessing/GlitchPass.js';
import { UnrealBloomPass } from '../../three/jsm/postprocessing/UnrealBloomPass.js';

import Stats from '../../three/jsm/libs/stats.module.js';



class ResourceTracker {
    constructor() {
        this.resources = new Set();
    }
    track(resource) {
        if (!resource) {
            return resource;
        }

        // handle children and when material is an array of materials or
        // uniform is array of textures
        if (Array.isArray(resource)) {
            resource.forEach(resource => this.track(resource));
            return resource;
        }

        if (resource.dispose || resource instanceof THREE.Object3D) {
            this.resources.add(resource);
        }
        if (resource instanceof THREE.Object3D) {
            this.track(resource.geometry);
            this.track(resource.material);
            this.track(resource.children);
        } else if (resource instanceof THREE.Material) {
            // We have to check if there are any textures on the material
            for (const value of Object.values(resource)) {
                if (value instanceof THREE.Texture) {
                    this.track(value);
                }
            }
            // We also have to check if any uniforms reference textures or arrays of textures
            if (resource.uniforms) {
                for (const value of Object.values(resource.uniforms)) {
                    if (value) {
                        const uniformValue = value.value;
                        if (uniformValue instanceof THREE.Texture ||
                                Array.isArray(uniformValue)) {
                            this.track(uniformValue);
                        }
                    }
                }
            }
        }
        return resource;
    }
    untrack(resource) {
        this.resources.delete(resource);
    }
    dispose() {
        for (const resource of this.resources) {

            if (resource instanceof THREE.Object3D) {
                if (resource.parent) {
                    resource.parent.remove(resource);
                }
            }
            if (resource.dispose) {
                resource.dispose();
            }
        }
        this.resources.clear();
    }
}

class MultiScene {

    constructor(data) {
        this.json = data;
        this.resTracker = new ResourceTracker();
        this.track = this.resTracker.track.bind(this.resTracker);
        this.words = ['ReMETA', 'sacri.ru', 're', 'meta', 'multi'];
        this.stats = Stats();
        //document.body.appendChild(this.stats.dom);
        
        this.now = Date.now();
        this.delta = Date.now();
        this.then = Date.now();
        this.interval = 1000/30;
        
    }

    set_scenes(id) {
        this.scene_id = id;
        this.sname = 'scene' + id;
        let start = this.json[this.sname]['start_position'];
        this.scenes = {
            Scene: {
                name: 'Main',
                url: 'assets/meta/multi/models/gltf/' + this.json[this.sname]['gltf'] + '.gltf',
                cameraPos: new THREE.Vector3(start['x'], start['y'], start['z']),
                animationTime: 4,
                extensions: ['glTF']
            }
        };
    }

    camera_create() {
        if (this.scene_id === 1) {
            this.camera = new THREE.PerspectiveCamera(this.json[this.sname]['perspective'], this.w / this.h, 0.1, 1400);
            this.controls = new TrackballControls(this.camera, this.renderer.domElement);
            this.controls.maxDistance = 1000;
            this.controls.enabled = false;
        }
        this.camera.position.x = 1000;
    }

    init(gltf) {
        this.set_scenes(gltf);
        this.mobile = false;
        this.mob_delta = 0;
        this.clock = new THREE.Clock();
        this.container = document.getElementById('container');
        this.w = this.container.offsetWidth;
        this.h = this.container.offsetHeight;
        //this.scene = new THREE.Scene();


        this.step = 0;
        this.scroll_dist = 5;
        this.lookSpeed = 0.5;
        this.view = {
            "x": 0,
            "y": 0,
            "z": 0
        };
        this.lookFlag = false;
        this.smoothing = 50;
        this.keys = {
            'top': {
                'down': false,
                'code': 87,
                'param': 1,
                'axis': 'y',
                'smooth': false
            },
            'bottom': {
                'down': false,
                'code': 83,
                'param': -1,
                'axis': 'y',
                'smooth': false
            },
            'left': {
                'down': false,
                'code': 68,
                'param': -1,
                'axis': 'z',
                'smooth': false
            },
            'right': {
                'down': false,
                'code': 65,
                'param': 1,
                'axis': 'z',
                'smooth': false
            }
        };
        this.godrayRenderTargetResolutionMultiplier = 1.0 / 4.0;

        this.scene = new THREE.Scene();

        this.loader = new GLTFLoader();
        this.loader.setDDSLoader(new DDSLoader());
        this.add_shader();
        //window.addEventListener('resize', this.on_window_resize, false);
    }

    set_path() {
        let dots = this.json[this.sname]['path'];
        let vectors = [];
        for (let i = 0; i < Object.keys(dots).length; i++) {
            vectors.push(new THREE.Vector3(dots[i][0], dots[i][1], dots[i][2]));
        }
        this.spline = new THREE.CatmullRomCurve3(vectors);
        this.spline.closed = false;
        if (this.json[this.sname]['debug']) {
            let points = this.spline.getPoints(50);
            let geometry = this.track(new THREE.BufferGeometry().setFromPoints(points));
            let material = this.track(new THREE.LineBasicMaterial({color: 0xff0000}));
            let curveObject = this.track(new THREE.Line(geometry, material));
            this.scene.add(curveObject);
        }
    }

    render_create() {
        if (this.scene_id === 1) {
            this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: false});
            this.renderer.autoClear = true;
            this.renderer.autoClearColor = true;
            this.renderer.autoClearDepth = true;
            this.renderer.autoClearStencil = true;
            this.renderer.debug.checkShaderErrors = true;
            this.container.appendChild(this.renderer.domElement);

        }
    }

    postprocessing_create() {
        if (this.scene_id === 1) {
            this.composer = this.track(new EffectComposer(this.renderer));
            this.composer.addPass(new RenderPass(this.scene, this.camera));
            this.glitchPass = this.track(new GlitchPass());
            this.composer.addPass(this.glitchPass);
            this.bloomPass = this.track(new UnrealBloomPass(new THREE.Vector2(this.w, this.h), 1.5, 0.4, 0.85));
            this.bloomPass.threshold = 0;
            this.bloomPass.strength = 1;
            this.bloomPass.radius = 0;
            this.composer.addPass(this.bloomPass);
        }
        this.glitchPass.goWild = false;
    }

    onload() {
        this.figure = {
            'cubes': [],
            'text': [],
            'mirror': []
        };
        this.render_create();
        this.camera_create();
        this.postprocessing_create();

        this.container.style.background = this.json[this.sname]['background'];
        this.container.style.filter = this.json[this.sname]['css']['filter'];
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.w, this.h);
        this.composer.setSize(this.w, this.h);
        this.renderer.physicallyCorrectLights = true;

        this.set_path();
        this.extra();
        this.init_scene(this.scenes[ 'Scene' ]);
    }

    extra() {
        let mark = this.json[this.sname]['extra_func'];
        if (mark.indexOf('add_img') !== -1) {
            this.add_img(1, [750, -100, -100]);
            this.add_img(3, [900, 5, 45]);
            this.add_img(3, [400, 40, 60]);
        }
        if (mark.indexOf('add_cube') !== -1) {
            for (let i = 0; i < 100; i++) {
                this.add_cube();
            }
        }
        if (mark.indexOf('add_text') !== -1) {

            this.add_text();

        }
        if (mark.indexOf('mirrors_massive') !== -1) {
            this.mirrors_massive();
        }
        if (mark.indexOf('add_center_mirror') !== -1) {
            this.add_center_mirror();
        }
        if (mark.indexOf('point_massive') !== -1) {
            this.point_massive();
        }
        if (mark.indexOf('mirrors_custom') !== -1) {
            this.mirrors_custom();
        }

    }

    gltf_done(gltf) {
        let object = this.track(gltf.scene);
         
        for (let i = 0; i < object.children.length; i++) {
            
            if (object.children[i].name === 'floor') {
                object.children[i].material = this.track(this.shaderMaterial);
            }
            if (object.children[i].name === 'sky') {
               
                object.children[i].material = this.track(this.shaderMaterial);
            }
        }

        let animations = gltf.animations;
        this.mixer = this.track(new THREE.AnimationMixer(object));
        for (let i = 0; i < animations.length; i++) {
            let animation = animations[ i ];
            if (this.time) {
                animation.duration = this.time;
            }
            let action = this.mixer.clipAction(animation);
            action.play();
        }
        this.add_obj(object);
        this.on_window_resize();
        this.animate();
        HTMLControlls.gltfReady();
    }

    load_GLTF(url) {
        let self = this;
        return new Promise((resolve, reject) => {
            this.track(this.loader.load(url, function (gltf) {
                self.gltf_done(gltf);
            }, undefined, reject));

        });
    }

    init_scene(sceneInfo) {
        let fog = this.json[this.sname]['fog'];
        this.scene.fog = this.track(new THREE.Fog(new THREE.Color(fog.color), fog.near, fog.far));
        this.scene.add(this.camera);

        let ambient = this.track(new THREE.AmbientLight(this.json[this.sname]['ambient']));



        this.scene.add(ambient);

        let lgt = this.json[this.sname]['light'];
        let light = this.track(new THREE.HemisphereLight(lgt.sky, lgt.color, lgt.power));
        this.scene.add(light);

        let spotlight;
        let spt = this.json[this.sname]['spot'];
        spotlight = this.track(new THREE.SpotLight(new THREE.Color(spt.color), 1));
        spotlight.position.set(spt['pos-x'], spt['pos-y'], spt['pos-z']);
        spotlight.angle = spt['angle'];
        spotlight.penumbra = spt['penumbra'];
        spotlight.intensity = spt['intensity'];
        spotlight.decay = spt['decay'];
        spotlight.castShadow = spt['castShadow'];
        spotlight.shadow.bias = 0.001;
        spotlight.shadow.mapSize.width = this.w;
        spotlight.shadow.mapSize.height = this.h;
        this.scene.add(spotlight);
        this.renderer.shadowMap.enabled = true; //?
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.gltf = this.load_GLTF(sceneInfo.url);

        this.camera.position.copy(sceneInfo.cameraPos);

    }

    add_obj(obj) {
        this.scene.add(obj);
    }

    on_window_resize() {
        this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
    }

    animate() {
            requestAnimationFrame(mScene.animate);
            if (mScene.json[mScene.sname]['animation']) {
                mScene.mixer.update(mScene.clock.getDelta());
            }
            mScene.controls.update();

            mScene.stats.begin();
            mScene.composer.render();
            mScene.render();
            mScene.stats.end();
            mScene.stats.update();
    }

    figure_scroll_rotate(d) {
        if (this.json[this.sname]['extra_func'].indexOf('add_sphere') !== -1) {
            this.figure.sphere.forEach((element) => {
                element.rotation.z += 0.01 * d;
                element.rotation.y += 0.01 * d;
                element.scale.x -= 0.008 * d;
                element.scale.y -= 0.008 * d;
                element.scale.z -= 0.008 * d;
            });
        }
    }

    rotate_scene(d) {
        if (this.json[this.sname]['extra_func'].indexOf('rotate_scene') !== -1) {
            this.scene.rotation.x += 0.01 * d;
        }
    }

    scroll_anim() {

    }

    scroll_for_object() {
        if (this.json[this.sname]['extra_func'].indexOf('mirrors_massive') !== -1) {
            this.figure.mirror.forEach((element) => {
                element.rotation.z += 0.05;
                element.rotation.y += 0.05;
            });
        }
    }

    geom_anim() {
        if (this.json[this.sname]['extra_func'].indexOf('add_cube') !== -1) {
            this.figure.cubes.forEach((element) => {
                element.rotation.x += element.random / 10000;
                element.rotation.y += element.random / 10000;
                element.rotation.z += element.random / 10000;
            });
        }
        if (this.json[this.sname]['extra_func'].indexOf('add_text') !== -1) {
            this.figure.text.forEach((element) => {
                element.rotation.x += element.random / 2000;
                element.rotation.y += element.random / 2000;
                element.rotation.z += element.random / 2000;
                element.position.y += element.random / 10;
                if (element.position.y > 2000) {
                    element.position.y = this.rand_int(-500, -100);
                }
            });
        }

        this.cMirror.rotation.x += 0.01;

    }

    render() {
        this.geom_anim();
        //this.post_render();
        this.uniforms.resolution.value.x = window.innerWidth;
        this.uniforms.resolution.value.y = window.innerHeight;
        this.uniforms[ "amplitude" ].value = 2.5 * Math.sin(Math.round(+new Date / 100) * this.shader_speed);
        //this.composer.render(this.scene, this.camera);
        //this.renderer.render(this.scene, this.camera);
    }

    get_step_size(filterLen, tapsPerPass, pass) {
        return filterLen * Math.pow(tapsPerPass, -pass);
    }

    add_img(name, coord) {
        let loader = this.track(new THREE.TextureLoader());
        let geometry, material;
        let self = this;
        loader.load('assets/meta/multi/texture' + name + '.png', function (texture) {
            geometry = this.track(new THREE.BoxGeometry(Math.random(2, 4), 50, 25));
            material = this.track(new THREE.MeshBasicMaterial({map: texture}));
            let cube = this.track(new THREE.Mesh(geometry, material));
            cube.position.x = coord[0];
            cube.position.y = coord[1];
            cube.position.z = coord[2];
            self.scene.add(cube);
            material.dispose();
        });
    }

    rand_int(min, max) {
        return min + Math.floor((max - min) * Math.random());
    }

    text_done(font) {
        let geometry;
        for (let i = 0; i < 100; i++) {
            geometry = this.track(new THREE.TextBufferGeometry(this.words[this.rand_int(0, this.words.length)], {
                font: font,
                size: this.rand_int(10, 30),
                height: 1,
                curveSegments: 12,
                bevelEnabled: false,
                bevelThickness: 10,
                bevelSize: 8,
                bevelOffset: 0,
                bevelSegments: 5
            }));
            var obj = this.track(new THREE.Mesh(geometry, this.shaderGrad));
            obj.position.x = this.rand_int(1000, -1000);
            obj.position.y = this.rand_int(-500, -100);
            obj.position.z = this.rand_int(-500, 500);
            obj.rotation.x = this.rand_int(-90, 90);
            obj.rotation.y = this.rand_int(-90, 90);
            obj.rotation.z = this.rand_int(-90, 90);
            obj.random = this.rand_int(1, 20);
            this.figure.text.push(obj);
            this.scene.add(obj);
        }
    }
    add_text() {
        var loader = new THREE.FontLoader();
        let self = this;
        loader.load('assets/Proxima.json', function (font) {
            self.text_done(font);
        });
    }

    cube_done(texture) {
        let rnd = this.rand_int(1, 50);
        let geometry = this.track(new THREE.BoxGeometry(rnd, rnd, rnd));
        let material = this.track(new THREE.MeshBasicMaterial({map: texture}));
        let cube = this.track(new THREE.Mesh(geometry, material));
        cube.position.x = this.rand_int(1000, -1000);
        cube.position.y = this.rand_int(-500, 500);
        cube.position.z = this.rand_int(-500, 500);
        cube.rotation.x = this.rand_int(-90, 90);
        cube.rotation.y = this.rand_int(-90, 90);
        cube.rotation.z = this.rand_int(-90, 90);
        cube.random = this.rand_int(-100, 100);
        this.scene.add(cube);
        this.figure.cubes.push(cube);
    }
    add_cube() {
        let loader = new THREE.TextureLoader();
        let txt = Math.floor(Math.random() * Math.floor(14)) + 1;
        let self = this;
        loader.load('assets/meta/multi/texture/' + txt + '.png', function (texture) {
            self.cube_done(texture);
        });
    }
    add_center_mirror() {
        var mirrorGeometry = this.track(new THREE.IcosahedronBufferGeometry(40));
        this.cMirror = this.track(new Reflector(mirrorGeometry, {
            clipBias: 0.05,
            textureWidth: this.w * window.devicePixelRatio,
            textureHeight: this.h * window.devicePixelRatio,
            color: 0x777777,
            recursion: 1
        }));
        this.cMirror.rotation.y = 90;
        this.cMirror.position.y = 10;
        this.scene.add(this.cMirror);
    }

    mirrors_massive(x = 580, y = 0, z = 0, size_y = 250, size_z = 250) {
        this.mir_wal = [];
        for (let j = 0; j < 3; j++) {
            for (let i = 0; i < 3; i++) {

                if ((i !== 0) || (j !== 1)) {
                    let geometry = this.track(new THREE.BoxGeometry(1, size_z, size_y));
                    this.mir_wal[i] = this.track(new Reflector(geometry, {
                        clipBias: 0.05,
                        textureWidth: this.w * window.devicePixelRatio,
                        textureHeight: this.h * window.devicePixelRatio,
                        color: 0x777777,
                        recursion: 1
                    }));
                    this.mir_wal[i].position.x = x - i;
                    this.mir_wal[i].position.y = i * size_y - 0;
                    this.mir_wal[i].position.z = j * size_z - 200;
                    this.mir_wal[i].rotation.z = -0.2;
                    this.figure.mirror.push(this.mir_wal[i]);
                    this.scene.add(this.mir_wal[i]);
                }
            }
    }

    }

    mirrors_custom() {
        let data = this.json[this.sname].mirror;
        let geometry, mirror;
        for (let i = 0; i < Object.keys(data).length; i++) {
            geometry = this.track(new THREE.BoxGeometry(1, data[i].size.w, data[i].size.h));
            mirror = this.track(new Reflector(geometry, {
                clipBias: 0.05,
                textureWidth: this.w * window.devicePixelRatio,
                textureHeight: this.h * window.devicePixelRatio,
                color: 0x777777,
                recursion: 1
            }));
            mirror.position.x = data[i].pos.x;
            mirror.position.y = data[i].pos.y;
            mirror.position.z = data[i].pos.z;
            mirror.rotation.x = data[i].rotate.x;
            mirror.rotation.y = data[i].rotate.y;
            mirror.rotation.z = data[i].rotate.z;
            this.scene.add(mirror);
        }

    }

    point_massive() {
        var vertices = [];
        for (var i = 0; i < 10000; i++) {
            var x = THREE.MathUtils.randFloatSpread(2000);
            var y = THREE.MathUtils.randFloatSpread(2000);
            var z = THREE.MathUtils.randFloatSpread(2000);
            vertices.push(x, y, z);
        }

        var geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        var material = this.track(new THREE.PointsMaterial({color: 0x888888}));
        var points = this.track(new THREE.Points(geometry, material));

        this.scene.add(points);
    }

    add_mirror() {
        var mirrorGeometry = this.track(new THREE.CircleGeometry(400, 400));
        this.groundMirror = this.track(new Reflector(mirrorGeometry, {
            clipBias: 0.05,
            textureWidth: this.w * window.devicePixelRatio,
            textureHeight: this.h * window.devicePixelRatio,
            color: 0x777777,
            recursion: 1
        }));

        this.groundMirror.rotation.y = 90;
        this.scene.add(this.groundMirror);
    }

    add_shader() {
        this.uniforms = {
            "amplitude": {value: 1.0},
            "color": {value: new THREE.Color(0xff2200)},
            "colorTexture": {value: new THREE.TextureLoader().load("assets/meta/multi/texture/3.png")}
        };

        this.uniforms.resolution = {type: 'v2', value: new THREE.Vector2(this.w, this.h)};

        this.uniforms[ "colorTexture" ].value.wrapS = this.uniforms[ "colorTexture" ].value.wrapT = THREE.RepeatWrapping;
        this.shaderMaterial = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: document.getElementById('vertexshader').textContent,
            fragmentShader: document.getElementById('fragmentshader').textContent
        });
        this.shader_speed = 0.001;
        
        this.shaderGrad = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            fragmentShader: document.getElementById('fragShader').textContent
        });



    }
    scroll_timer_stop() {
        $.doTimeout('loopx');
        $.doTimeout('loopy');
        $.doTimeout('loopz');
    }

    scroll_step_done(coord, curve){
        if (Math.abs(this.camera.position[coord] - curve[coord]) > 1) {
                let tmp = (this.camera.position[coord] > curve[coord]) ? -1 : 1;
                if (Math.abs(this.camera.position[coord] - curve[coord]) > (this.scroll_dist * 10)) {
                    curve[coord] += (this.scroll_dist * 2) * tmp * (-1);
                }
                this.camera.position[coord] += Math.abs(this.camera.position[coord] - curve[coord]) / (this.scroll_dist * 10) * tmp;
                if (this.camera.position.x < 100) {
                    this.glitchPass.goWild = true;
                }
                if (this.camera.position.x < 4) { //проверка на окончание прокрутки
                    this.refresh();
                    return false;
                }
                return true;
            } else {
                return false;
            }
    }

    scroll_do(coord, curve) {
        let self = this;
        $.doTimeout('loop' + coord);
        $.doTimeout('loop' + coord, 1, function () {
            return self.scroll_step_done(coord, curve);
        });
    }

    do_step(d) {
        let nd = (d > 0) ? 1 : (-1);
        this.step += this.scroll_dist * (nd);
        return nd;
    }

    on_wheel(e) {
        let delta;
        if (this.mobile) {
            delta = this.mob_delta;
            this.scroll_dist = 10;
        } else {
            e = e || window.event;
            delta = (e !== undefined) ? e.deltaY || e.detail || e.wheelDelta : 20;
        }
        delta = this.do_step(delta);
        this.figure_scroll_rotate(delta);
        this.rotate_scene(delta);
        this.step = (this.step < 0) ? 0 : this.step;
        let curve_coord = this.spline.getPoint(this.step / 600);
        this.scroll_do('y', curve_coord);
        this.scroll_do('z', curve_coord);
        this.scroll_do('x', curve_coord);
        this.uniforms[ "color" ].value.offsetHSL(0.005, 0, 0);
        //this.uniforms[ "amplitude" ].value = 2.5 * Math.sin( this.figure.cubes[0].rotation.y * 4 );
        this.scroll_dist = this.speed_in_end(5);
        if (!this.json[this.sname]['animation']) {
            this.mixer.update(curve_coord.x / 2000);
        }

        this.scroll_for_object();
    }

    speed_in_end(max_speed) {
        let res = max_speed;
        if (this.camera.position.x < 400 && this.json[this.sname]['slow_end_speed']) {
            res = (this.camera.position.x < 200) ? (res / 4) : (res / 2);
        }
        return res;
    }

    look_stop(e) {
        let r = false;
        for (let key in this.keys) {
            if (e === this.keys[key].code) {
                this.keys[key].down = false;
                this.keys[key].smooth = true;
            }
            r += this.keys[key].down;
        }
        if (r === 0) {
            this.lookFlag = false;
        }
    }

    cursor_move(z,y){
        if (!this.mobile) {
            y = this.h/2 - y;
            z = this.w/2 - z;
            this.controls.target = new THREE.Vector3(this.view.x, y, z);
        }
    }


    look_at_target(e) {
        for (let key in this.keys) {
            if (e === this.keys[key]['code']) {
                this.keys[key].down = true;
                this.view[ this.keys[key]['axis'] ] += this.lookSpeed * this.keys[key]['param'];
            }
        }
        if (!this.lookFlag) {
            this.lookFlag = true;
            this.smoothing = 50;
            let self = this;
            $.doTimeout('look');
            $.doTimeout('look', 5, function () {
                for (let key in self.keys) {
                    if (self.keys[key].down || self.keys[key].smooth) {
                        self.view[ self.keys[key]['axis'] ] += (self.lookSpeed * self.keys[key]['param']);
                        if (self.smoothing <= 1) {
                            self.keys[key].smooth = false;
                        }
                    }
                }
                self.controls.target = new THREE.Vector3(self.view.x, self.view.y, self.view.z);
                if (self.lookFlag || self.smoothing > 1) {
                    self.smoothing = (self.smoothing <= 1) ? 50 : self.smoothing - 1;
                    return true;
                } else {
                    return false;
                }
            });
        }
    }

    refresh() {
        if (AudioControlls.flag) {
            AudioControlls.effects();
        }
        this.scene.rotation.x = 0;
        if (this.scene_id === Object.keys(this.json).length) {
            HTMLControlls.lastScene();
            this.end_scenes();
        } else {
            this.step = 0;
            this.scroll_dist = 5;
            this.renderer.clear(true, true, true);
            this.set_scenes((this.scene_id + 1));
            this.resTracker.dispose();
            this.renderer.dispose();
            this.onload();
        }
    }
    end_scenes() {
        mScene.resTracker.dispose();
        HTMLControlls.endScene();
        console.log(mScene.scene);
    }
}

// Старт событий и таймеров
var mScene = new MultiScene(json);
mScene.init(1);
mScene.onload();

$('#loader').on('wheel', function (e) {
    $.doTimeout('a_scroll');
    $('#play').removeClass("auto_scroll_on");
    mScene.on_wheel();
});

var lastY;
$('#loader').on('touchmove', function (e) {
    mScene.mobile = true;
    var currentY = e.originalEvent.touches[0].clientY;
    mScene.mob_delta = (currentY > lastY) ? -1 : 1;
    lastY = currentY;
    $('#loader').trigger('mousewheel');
});

if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent)) {
    HTMLControlls.mobileIcon();
} else {
    setTimeout(HTMLControlls.drop_wsda, 15000);
}

var sauto = false;
$('#play').click(function () {
    if (sauto) {
        sauto = false;
        $.doTimeout('a_scroll');
        $('#play').removeClass("auto_scroll_on");
    } else {
        sauto = true;
        $('#play').addClass("auto_scroll_on");
        $.doTimeout('a_scroll', 200, function () {
            mScene.on_wheel();
            return true;
        });
    }
});

$( "#loader" ).mousemove(function( event ) {
    mScene.cursor_move(event.clientX, event.clientY);
});

$( "#loader" ).click(function( ) {
    HTMLControlls.rand_rotate();
});

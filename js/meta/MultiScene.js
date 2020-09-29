/*
 * trtr7dr for sacri.ru
 * 
 * three.js / https://threejs.org/
 */

"use strict";
import * as THREE from '/three/build/three.module.js';
import { TrackballControls } from '/three/jsm/controls/TrackballControls.js';
import { GLTFLoader } from '/three/jsm/loaders/GLTFLoader.js';
import { DDSLoader } from '/three/jsm/loaders/DDSLoader.js';
import { GodRaysFakeSunShader, GodRaysDepthMaskShader, GodRaysCombineShader, GodRaysGenerateShader } from '/three/jsm/shaders/GodRaysShader.js';

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
         this.loader = new GLTFLoader();
        this.loader.setDDSLoader(new DDSLoader());
    }

    set_scenes(id) {
        this.scene_id = id;
        this.sname = 'scene' + id;
        let start = this.json[this.sname]['start_position'];
        this.scenes = {
            Scene: {
                name: 'Main',
                url: '/assets/meta/multi/models/gltf/' + this.json[this.sname]['gltf'] + '.gltf',
                cameraPos: new THREE.Vector3(start['x'], start['y'], start['z']),
                animationTime: 4,
                extensions: ['glTF']
            }
        };
    }

    camera_create() {
        this.camera = new THREE.PerspectiveCamera(this.json[this.sname]['perspective'], this.container.offsetWidth / this.container.offsetHeight, 0.1, 1000);
        this.controls = new TrackballControls(this.camera, this.renderer.domElement);
        this.controls.maxDistance = 1000;
        this.controls.enabled = false;
        this.camera.position.x = 1000;
    }

    init(gltf) {
        this.set_scenes(gltf);
        this.mobile = false;
        this.mob_delta = 0;
        this.clock = new THREE.Clock();
        this.container = document.getElementById('container');
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

    post_preparation() {
        let ray = this.json[this.sname]['ray'];
        this.sunColor = ray.sun;
        this.sunPosition = new THREE.Vector3(ray.position.x, ray.position.y, ray.position.z);
        this.clipPosition = new THREE.Vector4();
        this.screenSpacePosition = new THREE.Vector3();
    }

    onload() {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});

        this.camera_create();
        this.renderer.autoClear = true;
        this.renderer.autoClearColor = true;
        this.renderer.autoClearDepth = true;
        this.renderer.autoClearStencil = true;
        this.renderer.debug.checkShaderErrors = false;

        this.figure = {
            'cubes': [],
            'sphere': []
        };
        this.container.style.background = this.json[this.sname]['background'];
        this.container.style.filter = this.json[this.sname]['css']['filter'];
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.physicallyCorrectLights = true;
        this.container.appendChild(this.renderer.domElement);

        this.postprocessing = {enabled: this.json[this.sname]['ray']['enabled']};
        this.post_preparation();
        this.init_postprocessing(window.innerWidth, window.innerHeight);

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
        if (mark.indexOf('add_sphere') !== -1) {
            for (let i = 0; i < 5; i++) {
                this.add_sphere();
            }
        }
    }

    gltf_done(gltf, time) {
        let object = this.track(gltf.scene);
        let animations = gltf.animations;
        this.mixer = new THREE.AnimationMixer(object);
        for (let i = 0; i < animations.length; i++) {
            let animation = animations[ i ];
            if (time) {
                animation.duration = time;
            }
            let action = this.mixer.clipAction(animation);
            action.play();
        }
        this.add_obj(object);
        this.on_window_resize();
        this.animate();
        HTMLControlls.gltfReady();
    }

    gltf_load(url, time) {
        let self = this;
        return new Promise((resolve, reject) => {
            this.track(this.loader.load(url, function (gltf) {
                self.gltf_done(gltf);
            }, undefined, reject));

        });
    }

    init_scene(sceneInfo) {
        let fog = this.json[this.sname]['fog'];
        this.scene.fog = new THREE.Fog(new THREE.Color(fog.color), fog.near, fog.far);
        this.scene.add(this.camera);

        let ambient = new THREE.AmbientLight(this.json[this.sname]['ambient']);
        this.scene.add(ambient);

        let lgt = this.json[this.sname]['light'];
        let light = new THREE.HemisphereLight(lgt.sky, lgt.color, lgt.power);
        this.scene.add(light);

        let spotlight;
        let spt = this.json[this.sname]['spot'];
        spotlight = new THREE.SpotLight(new THREE.Color(spt.color), 1);
        spotlight.position.set(spt['pos-x'], spt['pos-y'], spt['pos-z']);
        spotlight.angle = spt['angle'];
        spotlight.penumbra = spt['penumbra'];
        spotlight.intensity = spt['intensity'];
        spotlight.decay = spt['decay'];
        spotlight.castShadow = spt['castShadow'];
        spotlight.shadow.bias = 0.001;
        spotlight.shadow.mapSize.width = 2048;
        spotlight.shadow.mapSize.height = 2048;
        this.scene.add(spotlight);
        this.renderer.shadowMap.enabled = true; //?
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.gltf_load(sceneInfo.url, sceneInfo.animationTime);
        this.camera.position.copy(sceneInfo.cameraPos);
    }

    add_obj(obj) {
        this.scene.add(obj);
    }

    on_window_resize() {
        this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(mScene.animate);
        if (mScene.json[mScene.sname]['animation']) {
            mScene.mixer.update(mScene.clock.getDelta());
        }
        mScene.controls.update();
        mScene.render();
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

    geom_anim() {
        if (this.json[this.sname]['extra_func'].indexOf('add_cube') !== -1) {
            this.figure.cubes.forEach((element) => {
                element.rotation.x += element.random / 10000;
                element.rotation.y += element.random / 10000;
                element.rotation.z += element.random / 10000;
            });
        }
    }

    post_render() {
        if (this.postprocessing) {
            this.clipPosition.x = this.sunPosition.x;
            this.clipPosition.y = this.sunPosition.y;
            this.clipPosition.z = this.sunPosition.z;
            this.clipPosition.w = 1;
            this.clipPosition.applyMatrix4(this.camera.matrixWorldInverse).applyMatrix4(this.camera.projectionMatrix);
            this.clipPosition.x /= this.clipPosition.w;
            this.clipPosition.y /= this.clipPosition.w;
            this.screenSpacePosition.x = (this.clipPosition.x + 1) / 2; // transform from [-1,1] to [0,1]
            this.screenSpacePosition.y = (this.clipPosition.y + 1) / 2; // transform from [-1,1] to [0,1]
            this.screenSpacePosition.z = this.clipPosition.z; // needs to stay in clip space for visibilty checks
            this.postprocessing.godrayGenUniforms.vSunPositionScreenSpace.value.copy(this.screenSpacePosition);
            this.postprocessing.godraysFakeSunUniforms.vSunPositionScreenSpace.value.copy(this.screenSpacePosition);
            this.renderer.setRenderTarget(this.postprocessing.rtTextureColors);
            this.renderer.clear(true, true, false);
            let sunsqH = 0.8 * window.innerHeight; // 0.74 depends on extent of sun from shader
            let sunsqW = sunsqH; // both depend on height because sun is aspect-corrected
//            this.screenSpacePosition.x *= window.innerWidth;
//            this.screenSpacePosition.y *= window.innerHeight;
            this.renderer.setScissor(this.screenSpacePosition.x - sunsqW / 2, this.screenSpacePosition.y - sunsqH / 2, sunsqW, sunsqH);
            //this.renderer.setScissorTest(true);
            this.postprocessing.godraysFakeSunUniforms[ "fAspect" ].value = window.innerWidth / window.innerHeight;
            this.postprocessing.scene.overrideMaterial = this.postprocessing.materialGodraysFakeSun;
            this.renderer.setRenderTarget(this.postprocessing.rtTextureColors);
            this.renderer.render(this.postprocessing.scene, this.postprocessing.camera);
            this.renderer.setScissorTest(false);
            this.scene.overrideMaterial = null;
            this.renderer.setRenderTarget(this.postprocessing.rtTextureColors);
            this.renderer.render(this.scene, this.camera);
            // Depth
            this.scene.overrideMaterial = this.materialDepth;
            this.renderer.setRenderTarget(this.postprocessing.rtTextureDepth);
            this.renderer.clear();
            this.renderer.render(this.scene, this.camera);
            this.postprocessing.godrayMaskUniforms[ "tInput" ].value = this.postprocessing.rtTextureDepth.texture;
            this.postprocessing.scene.overrideMaterial = this.postprocessing.materialGodraysDepthMask;
            this.renderer.setRenderTarget(this.postprocessing.rtTextureDepthMask);
            this.renderer.render(this.postprocessing.scene, this.postprocessing.camera);
            let filterLen = .8;
            let TAPS_PER_PASS = 6.0;
            this.filter_god_rays(this.postprocessing.rtTextureDepthMask.texture, this.postprocessing.rtTextureGodRays2, this.get_step_size(filterLen, TAPS_PER_PASS, this.json[this.sname].ray.params[0]));
            this.filter_god_rays(this.postprocessing.rtTextureGodRays2.texture, this.postprocessing.rtTextureGodRays1, this.get_step_size(filterLen, TAPS_PER_PASS, this.json[this.sname].ray.params[1]));
            this.filter_god_rays(this.postprocessing.rtTextureGodRays1.texture, this.postprocessing.rtTextureGodRays2, this.get_step_size(filterLen, TAPS_PER_PASS, this.json[this.sname].ray.params[2]));
            this.postprocessing.godrayCombineUniforms[ "tColors" ].value = this.postprocessing.rtTextureColors.texture;
            this.postprocessing.godrayCombineUniforms[ "tGodRays" ].value = this.postprocessing.rtTextureGodRays2.texture;
            this.postprocessing.scene.overrideMaterial = this.postprocessing.materialGodraysCombine;
            this.renderer.setRenderTarget(null);
            this.renderer.render(this.postprocessing.scene, this.postprocessing.camera);
            this.postprocessing.scene.overrideMaterial = null;
        }
    }

    render() {
        this.geom_anim();
        this.post_render();
        //this.renderer.render( this.scene, this.camera );
    }

    get_step_size(filterLen, tapsPerPass, pass) {
        return filterLen * Math.pow(tapsPerPass, -pass);
    }

    rand_int(min, max) {
        return min + Math.floor((max - min) * Math.random());
    }

    add_cube() {
        let loader = new THREE.TextureLoader();
        let txt = Math.floor(Math.random() * Math.floor(14)) + 1;
        let self = this;
        loader.load('/assets/meta/multi/texture/' + txt + '.png', function (texture) {
            let rnd = self.rand_int(1, 50);
            let geometry = self.track(new THREE.BoxGeometry(rnd, rnd, rnd));
            let material = self.track(new THREE.MeshBasicMaterial({map: texture}));
            let cube = self.track(new THREE.Mesh(geometry, material));
            cube.position.x = self.rand_int(1000, -1000);
            cube.position.y = self.rand_int(-500, 500);
            cube.position.z = self.rand_int(-500, 500);
            cube.rotation.x = self.rand_int(-90, 90);
            cube.rotation.y = self.rand_int(-90, 90);
            cube.rotation.z = self.rand_int(-90, 90);
            cube.random = self.rand_int(-100, 100);
            self.scene.add(cube);
            self.figure.cubes.push(cube);
            geometry.dispose();
            material.dispose();
        });
    }

    add_sphere() {
        let loader = new THREE.TextureLoader();
        let self = this;
        loader.load('/assets/meta/multi/texture/bone.jpg', function (texture) {
            let geometry = self.track(new THREE.SphereGeometry(self.rand_int(1, 10), self.rand_int(1, 10), self.rand_int(1, 10), self.rand_int(1, 20), self.rand_int(1, 10), self.rand_int(1, 20), self.rand_int(1, 20), self.rand_int(1, 20), self.rand_int(1, 20)));
            let material = self.track(new THREE.MeshBasicMaterial({map: texture}));
            let sphere = new THREE.Mesh(geometry, material);
            sphere.position.x = self.rand_int(-400, 400);
            sphere.position.y = self.rand_int(-400, 400);
            sphere.position.z = self.rand_int(-400, 400);
            sphere.lightMapIntensity = 2;
            self.scene.add(sphere);
            self.figure.sphere.push(sphere);
            geometry.dispose();
            material.dispose();
        });
    }

    scroll_timer_stop() {
        $.doTimeout('loopx');
        $.doTimeout('loopy');
        $.doTimeout('loopz');
    }

    scroll_do(coord, curve) {
        let self = this;
        $.doTimeout('loop' + coord);
        $.doTimeout('loop' + coord, 1, function () {
            if (Math.abs(self.camera.position[coord] - curve[coord]) > 1) {
                let tmp = (self.camera.position[coord] > curve[coord]) ? -1 : 1;
                if (Math.abs(self.camera.position[coord] - curve[coord]) > (self.scroll_dist * 10)) {
                    curve[coord] += (self.scroll_dist * 2) * tmp * (-1);
                }
                self.camera.position[coord] += Math.abs(self.camera.position[coord] - curve[coord]) / (self.scroll_dist * 10) * tmp;
                if (self.camera.position.x < 4) { //проверка на окончание прокрутки
                    self.refresh();
                    return false;
                }
                return true;
            } else {
                return false;
            }
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
        this.scroll_dist = this.speed_in_end(5);
        if (!this.json[this.sname]['animation']) {
            this.mixer.update(curve_coord.x / 2000);
        }
    }

    speed_in_end(max_speed) {
        let res = max_speed;
        if (this.camera.position.x < 400 && this.json[this.sname]['slow_end_speed']) {
            res = (this.camera.position.x < 200) ? (res / 4) : (res / 2);
        }
        return res;
    }

    init_postprocessing(renderTargetWidth, renderTargetHeight) {
        this.postprocessing.scene = new THREE.Scene();
        this.postprocessing.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -10000, 10000);
        this.postprocessing.camera.position.z = 100;
        this.postprocessing.scene.add(this.postprocessing.camera);
        let pars = {minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat};
        this.postprocessing.rtTextureColors = new THREE.WebGLRenderTarget(renderTargetWidth, renderTargetHeight, pars);
        this.postprocessing.rtTextureDepth = new THREE.WebGLRenderTarget(renderTargetWidth, renderTargetHeight, pars);
        this.postprocessing.rtTextureDepthMask = new THREE.WebGLRenderTarget(renderTargetWidth, renderTargetHeight, pars);

        let adjustedWidth = renderTargetWidth * this.godrayRenderTargetResolutionMultiplier;
        let adjustedHeight = renderTargetHeight * this.godrayRenderTargetResolutionMultiplier;
        this.postprocessing.rtTextureGodRays1 = new THREE.WebGLRenderTarget(adjustedWidth, adjustedHeight, pars);
        this.postprocessing.rtTextureGodRays2 = new THREE.WebGLRenderTarget(adjustedWidth, adjustedHeight, pars);

        let godraysMaskShader = GodRaysDepthMaskShader;
        this.postprocessing.godrayMaskUniforms = THREE.UniformsUtils.clone(godraysMaskShader.uniforms);
        this.postprocessing.materialGodraysDepthMask = new THREE.ShaderMaterial({
            uniforms: this.postprocessing.godrayMaskUniforms,
            vertexShader: godraysMaskShader.vertexShader,
            fragmentShader: godraysMaskShader.fragmentShader
        });

        let godraysGenShader = GodRaysGenerateShader;
        this.postprocessing.godrayGenUniforms = THREE.UniformsUtils.clone(godraysGenShader.uniforms);
        this.postprocessing.materialGodraysGenerate = new THREE.ShaderMaterial({
            uniforms: this.postprocessing.godrayGenUniforms,
            vertexShader: godraysGenShader.vertexShader,
            fragmentShader: godraysGenShader.fragmentShader
        });

        let godraysCombineShader = GodRaysCombineShader;
        this.postprocessing.godrayCombineUniforms = THREE.UniformsUtils.clone(godraysCombineShader.uniforms);
        this.postprocessing.materialGodraysCombine = new THREE.ShaderMaterial({
            uniforms: this.postprocessing.godrayCombineUniforms,
            vertexShader: godraysCombineShader.vertexShader,
            fragmentShader: godraysCombineShader.fragmentShader
        });

        let godraysFakeSunShader = GodRaysFakeSunShader;
        this.postprocessing.godraysFakeSunUniforms = THREE.UniformsUtils.clone(godraysFakeSunShader.uniforms);
        this.postprocessing.materialGodraysFakeSun = new THREE.ShaderMaterial({
            uniforms: this.postprocessing.godrayMaskUniforms,
            vertexShader: godraysFakeSunShader.vertexShader,
            fragmentShader: godraysFakeSunShader.fragmentShader
        });

        this.postprocessing.godraysFakeSunUniforms.sunColor.value.setHex(this.sunColor);
        this.postprocessing.godrayCombineUniforms.fGodRayIntensity.value = 0.75;
        this.postprocessing.quad = this.track(new THREE.Mesh(
                new THREE.PlaneBufferGeometry(1.0, 1.0),
                this.postprocessing.materialGodraysGenerate
                ));
        this.postprocessing.quad.position.z = -9900;
        this.postprocessing.scene.add(this.postprocessing.quad);
    }

    filter_god_rays(inputTex, renderTarget, stepSize) {
        this.postprocessing.scene.overrideMaterial = this.postprocessing.materialGodraysGenerate;
        this.postprocessing.godrayGenUniforms[ "fStepSize" ].value = stepSize;
        this.postprocessing.godrayGenUniforms[ "tInput" ].value = inputTex;
        this.renderer.setRenderTarget(renderTarget);
        this.renderer.render(this.postprocessing.scene, this.postprocessing.camera);
        this.postprocessing.scene.overrideMaterial = null;
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


    dispose_postprocessing() {
        this.postprocessing.godrayMaskUniforms[ "tInput" ].value.dispose();
        this.postprocessing.godrayGenUniforms[ "tInput" ].value.dispose();
        this.postprocessing.godrayCombineUniforms[ "tColors" ].value.dispose();
        this.postprocessing.rtTextureColors.dispose();
        this.postprocessing.rtTextureDepth.dispose();
        this.postprocessing.rtTextureDepthMask.dispose();
        this.postprocessing.rtTextureGodRays1.dispose();
        this.postprocessing.rtTextureGodRays2.dispose();
        this.postprocessing.materialGodraysDepthMask.dispose();
        this.postprocessing.materialGodraysGenerate.dispose();
        this.postprocessing.materialGodraysCombine.dispose();
        this.postprocessing.materialGodraysFakeSun.dispose();
    }

    refresh() {
        if (AudioControlls.flag) {
            AudioControlls.effects();
        }
        this.scene.rotation.x = 0;
        if (this.scene_id === Object.keys(this.json).length) {
            HTMLControlls.lastScene();
            setTimeout(this.end_scenes, 700);
        } else {
            this.step = 0;
            this.scroll_dist = 5;
            this.resTracker.dispose();
            this.dispose_postprocessing();
            this.renderer.clear(true, true, true);

            this.set_scenes((this.scene_id + 1));
            this.onload();
        }
    }

    end_scenes() {
        mScene.dispose_scene();
        mScene.dispose_postprocessing();
        for (let i = mScene.scene.children.length - 1; i >= 0; i--) {
            mScene.scene.remove(mScene.scene.children[i]);
        }
        HTMLControlls.endScene();
    }
}

// Старт событий и таймеров
var mScene = new MultiScene(json);
mScene.init(1);
mScene.onload();

$('#loader').on('mousewheel', function (e) {
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

$("body").keydown(function (e) {
    mScene.look_at_target(e.which);
});

$("body").keyup(function (e) {
    mScene.look_stop(e.which);
});

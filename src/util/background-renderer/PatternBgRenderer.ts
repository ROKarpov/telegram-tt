import {
  Color,
  GLBuffers,
  GLData, GLDataFull,
  GLProgramInfo,
  Position,
  SceneData,
} from './types';

import {
  ANIMATION_DURATION,
  B_OFFSET,
  COLOR_COMPONENT_COUNT,
  G_OFFSET,
  MAX_GRADIENT_STOP_COUNT,
  POSITION_COMPONENT_COUNT,
  POSITIONS,
  R_OFFSET,
  X_OFFSET,
  Y_OFFSET,
} from './constants';
import { easeInOutQuad } from './easeInOut';

const vsSource = `#version 300 es
    in vec4 aVertexPosition;

    void main(void) {
      gl_Position = aVertexPosition;
    }
  `;

const fsSource = `#version 300 es
    #define maxColorLength ${MAX_GRADIENT_STOP_COUNT}

    precision highp float;

    uniform ivec2 uResolution;
    uniform int uColorLength;
    uniform vec3 uColors[maxColorLength];
    uniform vec2 uColorPositions[maxColorLength];
    uniform sampler2D uPattern;
    uniform int uIntensity;

    layout(location = 0) out vec4 fragColor;

    vec4 getBackgroundColor(in vec2 position) {
        if (uColorLength == 1) {
          return vec4(uColors[0][0], uColors[0][1], uColors[0][2], 1.0);
        }

        vec2 centerDistanceCoord = position / vec2(uResolution);
        centerDistanceCoord.x = centerDistanceCoord.x - 0.5;
        centerDistanceCoord.y = 0.5 - centerDistanceCoord.y;

        float centerDistance = sqrt(
          centerDistanceCoord.x * centerDistanceCoord.x
          + centerDistanceCoord.y * centerDistanceCoord.y
        );

        float swirlFactor = 0.35 * centerDistance;
        float theta = swirlFactor * swirlFactor * 0.8 * 8.0;
        float sinTheta = sin(theta);
        float cosTheta = cos(theta);
        vec2 pixel = vec2(
            max(0.0, min(1.0, 0.5 + centerDistanceCoord.x * cosTheta - centerDistanceCoord.y * sinTheta)),
            max(0.0, min(1.0, 0.5 + centerDistanceCoord.x * sinTheta + centerDistanceCoord.y * cosTheta))
        );

        float distanceSum = 0.0;
        float r = 0.0;
        float g = 0.0;
        float b = 0.0;
        for(int i = 0; i < uColorLength; ++i) {
          vec2 distanceCoord = pixel - uColorPositions[i];
          float distance = max(0.0, 0.9 - sqrt(distanceCoord.x * distanceCoord.x + distanceCoord.y * distanceCoord.y));
          distance = distance * distance * distance * distance;

          distanceSum += distance;

          r += distance * uColors[i].r;
          g += distance * uColors[i].g;
          b += distance * uColors[i].b;
        }

        return vec4(
            r / distanceSum,
            g / distanceSum,
            b / distanceSum,
            1.0
        );
    }

    vec4 getPatternColor(in vec2 position) {
        vec2 positionNormalized = vec2(position);
        positionNormalized.y = float(uResolution.y) - positionNormalized.y;

        int level = 0;
        vec2 size = vec2(textureSize(uPattern, level));
        vec2 patternPixel = positionNormalized - size * floor(positionNormalized / size);

        return texelFetch(uPattern, ivec2(patternPixel), level);
    }

    void main(void) {
        vec2 position = gl_FragCoord.xy;
        vec4 bgColor = getBackgroundColor(position);
        vec4 patternColor = getPatternColor(position);

        vec4 result;
        if (uIntensity >= 0) {
          float intensitiedAlpha = float(uIntensity) * patternColor[3] / 100.0;
          result = (1.0 - intensitiedAlpha) * bgColor + intensitiedAlpha * patternColor;
          result[3] = 1.0;
        } else if (uIntensity == -1) {
          result = vec4(0.0, 0.0, 0.0, 1.0);
        } else {
          float intensifiedAlpha = float(-uIntensity) * patternColor[3] / 100.0;
          result = intensifiedAlpha * bgColor;
          result[3] = 1.0;
        }

        fragColor = result;
    }
  `;

export class PatternBgRenderer {
  private phase = 0;

  private progress = 0;

  private then = 0;

  private queuedCount = 0;

  private readonly glData: GLData;

  readonly canvas: HTMLCanvasElement;

  constructor(
    canvas: HTMLCanvasElement,
  ) {
    this.canvas = canvas;
    // Initialize the GL context
    const gl = this.canvas.getContext('webgl2');

    // Only continue if WebGL is available and working
    if (!gl) {
      throw new Error(
        'Unable to initialize WebGL. Your browser or mfachine may not support it.',
      );
    }

    // Set clear color to black, fully opaque
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Clear the color buffer with specified clear color
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // Initialize a shader program; this is where all the lighting
    // for the vertices and so forth is established.
    const shaderProgram = PatternBgRenderer.initShaderProgram(
      gl,
      vsSource,
      fsSource,
    );

    // Collect all the info needed to use the shader program.
    // Look up which attribute our shader program is using
    // for aVertexPosition and look up uniform locations.
    const programInfo: GLProgramInfo = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      },
      uniformLocations: {
        resolution: gl.getUniformLocation(shaderProgram, 'uResolution'),
        colorLength: gl.getUniformLocation(shaderProgram, 'uColorLength'),
        colors: gl.getUniformLocation(shaderProgram, 'uColors'),
        colorPositions: gl.getUniformLocation(shaderProgram, 'uColorPositions'),
        intensity: gl.getUniformLocation(shaderProgram, 'uIntensity'),
        pattern: gl.getUniformLocation(shaderProgram, 'uPattern'),
      },
    };

    this.glData = {
      gl,
      programInfo,
      buffers: PatternBgRenderer.initBuffers(gl),
    };
  }

  requestTransition = () => {
    requestAnimationFrame(this.startTransition);
  };

  resize = (renderWidth: number, renderHeight: number) => {
    this.canvas.width = renderWidth;
    this.canvas.height = renderHeight;

    this.glData.gl.viewport(
      0,
      0,
      this.glData.gl.drawingBufferWidth,
      this.glData.gl.drawingBufferHeight,
    );
    this.glData.width = renderWidth;
    this.glData.height = renderHeight;

    if (this.glData.textures && this.glData.width !== undefined) {
      PatternBgRenderer.drawScene(
        this.glData,
        PatternBgRenderer.prepareScene(
          this.phase,
          easeInOutQuad(this.progress),
          this.glData.colors.length,
        ),
      );
      this.glData.gl.flush();
    }
  };

  changeWallpaper = async (
    patternUrl: string | undefined,
    colors:
    | [Color]
    | [Color, Color]
    | [Color, Color, Color]
    | [Color, Color, Color, Color],
    intensity: number,
  ) => {
    if (this.glData.textures) {
      this.glData.gl.deleteTexture(this.glData.textures.pattern);
    }
    this.glData.textures = await PatternBgRenderer.initTextures(
      this.glData.gl,
      patternUrl,
    );
    this.glData.colors = colors;
    this.glData.intensity = intensity;

    if (this.glData.width !== undefined && this.glData.textures) {
      PatternBgRenderer.drawScene(
        this.glData,
        PatternBgRenderer.prepareScene(
          this.phase,
          easeInOutQuad(this.progress),
          this.glData.colors.length,
        ),
      );
      this.glData.gl.flush();
    }
  };

  private startTransition = (now: number) => {
    ++this.queuedCount;
    now *= 0.001; // convert to seconds
    this.then = now;

    requestAnimationFrame(this.doTransitionFrame);
  };

  // Draw the scene repeatedly
  private doTransitionFrame = (now: number) => {
    if (!(this.glData.textures && this.glData.width !== undefined)) {
      return;
    }

    now *= 0.001; // convert to seconds
    this.progress = Math.min(
      this.progress + (now - this.then) / ANIMATION_DURATION,
      1,
    );
    this.then = now;

    PatternBgRenderer.drawScene(
      this.glData,
      PatternBgRenderer.prepareScene(
        this.phase,
        easeInOutQuad(this.progress),
        this.glData.colors.length,
      ),
    );

    if (this.progress === 1) {
      this.phase = (this.phase + 1) % POSITIONS.length;
      this.progress = 0;
      --this.queuedCount;
      if (this.queuedCount > 0) {
        requestAnimationFrame(this.doTransitionFrame);
      }
    } else {
      requestAnimationFrame(this.doTransitionFrame);
    }
  };

  private static initShaderProgram = (
    gl: WebGLRenderingContext,
    verticalShaderSource: string,
    fragmentShaderSource: string,
  ) => {
    const vertexShader = PatternBgRenderer.loadShader(gl, gl.VERTEX_SHADER, verticalShaderSource);
    const fragmentShader = PatternBgRenderer.loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    // Create the shader program
    const shaderProgram = gl.createProgram();
    if (!shaderProgram) {
      throw new Error('shaderProgram is not initialized');
    }

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, reutrn reject.
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      return Promise.reject(
        new Error(
          `Unable to initialize the shader program: ${gl.getProgramInfoLog(
            shaderProgram,
          )}`,
        ),
      );
    }

    return shaderProgram;
  };

  private static loadShader = (
    gl: WebGLRenderingContext,
    type: typeof gl.VERTEX_SHADER | typeof gl.FRAGMENT_SHADER,
    source: string,
  ) => {
    const shader = gl.createShader(type);

    if (!shader) {
      throw new Error(`Cannot initialize shader of type ${type}`);
    }

    // Send the source to the shader object
    gl.shaderSource(shader, source);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const errorMessage = `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`;
      gl.deleteShader(shader);
      throw new Error(errorMessage);
    }

    return shader;
  };

  private static initBuffers = (gl: WebGLRenderingContext): GLBuffers => {
    return {
      position: PatternBgRenderer.initPositionBuffer(gl),
    };
  };

  private static initPositionBuffer = (gl: WebGLRenderingContext) => {
    // Create a buffer for the square's positions.
    const positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Now create an array of positions for the square.
    const positions = [
      [1.0, 1.0],
      [-1.0, 1.0],
      [1.0, -1.0],
      [-1.0, -1.0],
    ];

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(positions.flat()),
      gl.STATIC_DRAW,
    );

    return positionBuffer;
  };

  private static initTextures = async (gl: WebGLRenderingContext, url: string | undefined) => {
    return {
      pattern: await PatternBgRenderer.loadPatternTexture(gl, url),
    };
  };

  private static loadPatternTexture = async (gl: WebGLRenderingContext, url: string | undefined) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const alignment = 1;

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, alignment);

    if (url) {
      const response = await fetch(url);
      if (!response.ok) {
        return Promise.reject(new Error('Cannot load pattern'));
      }

      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);
      gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        srcFormat,
        srcType,
        imageBitmap,
      );
    } else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        1,
        1,
        0,
        srcFormat,
        srcType,
        new Uint8Array([0, 0, 0, 0]),
      );
    }

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return texture;
  };

  private static prepareScene = (
    phase: number,
    progress: number,
    colorCount: number,
  ): SceneData => {
    const currentPositions = PatternBgRenderer.positionsForPhase(
      phase,
      colorCount,
    );
    const nextPositions = PatternBgRenderer.positionsForPhase(
      phase + 1,
      colorCount,
    );

    return {
      positions: currentPositions.map((position, index) => {
        const nextPosition = nextPositions[index];
        return {
          x: position.x + (nextPosition.x - position.x) * progress,
          y: position.y + (nextPosition.y - position.y) * progress,
        };
      }),
    };
  };

  private static positionsForPhase = (phase: number, count: number): Position[] => {
    const result = [];
    for (let i = 0; i < count; ++i) {
      result[i] = POSITIONS[(phase + i * Math.floor(POSITIONS.length / count)) % POSITIONS.length];
    }
    return result;
  };

  private static drawScene = (glData: GLDataFull, sceneData: SceneData) => {
    const { gl, programInfo } = glData;

    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things

    // Clear the canvas before we start drawing on it.

    // eslint-disable-next-line no-bitwise
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    PatternBgRenderer.setPositionAttribute(glData);

    // Tell WebGL we want to affect texture unit 0
    gl.activeTexture(gl.TEXTURE0);

    // Bind the texture to texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, glData.textures.pattern);

    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);

    // Set the shader uniforms
    // Tell the shader we bound the texture to texture unit 0
    gl.uniform1i(programInfo.uniformLocations.pattern, 0);

    gl.uniform1i(programInfo.uniformLocations.intensity, glData.intensity);

    gl.uniform2i(
      programInfo.uniformLocations.resolution,
      glData.width,
      glData.height,
    );
    PatternBgRenderer.setGradientUniforms(glData, sceneData);

    {
      const offset = 0;
      const vertexCount = 4;
      gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
  };

  private static setPositionAttribute = ({ gl, programInfo, buffers }: GLDataFull) => {
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset,
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  };

  private static setGradientUniforms = (
    { gl, programInfo, colors: colorsArg }: GLDataFull,
    { positions: positionsArgs }: SceneData,
  ) => {
    const colors = new Array<number>(
      MAX_GRADIENT_STOP_COUNT * COLOR_COMPONENT_COUNT,
    );
    const colorPositions = new Array<number>(
      MAX_GRADIENT_STOP_COUNT * POSITION_COMPONENT_COUNT,
    );
    for (let i = 0; i < colorsArg.length; ++i) {
      colors[COLOR_COMPONENT_COUNT * i + R_OFFSET] = colorsArg[i].r / 255;
      colors[COLOR_COMPONENT_COUNT * i + G_OFFSET] = colorsArg[i].g / 255;
      colors[COLOR_COMPONENT_COUNT * i + B_OFFSET] = colorsArg[i].b / 255;

      colorPositions[POSITION_COMPONENT_COUNT * i + X_OFFSET] = positionsArgs[i].x;
      colorPositions[POSITION_COMPONENT_COUNT * i + Y_OFFSET] = 1 - positionsArgs[i].y;
    }
    for (let i = colorsArg.length; i < MAX_GRADIENT_STOP_COUNT; ++i) {
      colors[COLOR_COMPONENT_COUNT * i + R_OFFSET] = 0;
      colors[COLOR_COMPONENT_COUNT * i + G_OFFSET] = 0;
      colors[COLOR_COMPONENT_COUNT * i + B_OFFSET] = 0;

      colorPositions[POSITION_COMPONENT_COUNT * i + X_OFFSET] = 0;
      colorPositions[POSITION_COMPONENT_COUNT * i + Y_OFFSET] = 0;
    }

    gl.uniform1i(programInfo.uniformLocations.colorLength, colorsArg.length);
    gl.uniform3fv(
      programInfo.uniformLocations.colors,
      new Float32Array(colors),
    );
    gl.uniform2fv(
      programInfo.uniformLocations.colorPositions,
      new Float32Array(colorPositions),
    );
  };
}

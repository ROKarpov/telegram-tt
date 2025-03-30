export type GLProgramInfo = {
  program: WebGLProgram;
  attribLocations: {
    vertexPosition: number;
  };
  uniformLocations: {
    resolution: WebGLUniformLocation | null;
    colorLength: WebGLUniformLocation | null;
    colors: WebGLUniformLocation | null;
    colorPositions: WebGLUniformLocation | null;
    intensity: WebGLUniformLocation | null;
    pattern: WebGLUniformLocation | null;
  };
};

export type GLBuffers = {
  position: WebGLBuffer | null;
};

export type GLTextures = {
  pattern: WebGLTexture | null;
};

export type Color = { r: number; g: number; b: number };

export type Position = { x: number; y: number };

type GLDataBase = {
  gl: WebGL2RenderingContext;
  programInfo: GLProgramInfo;
  buffers: GLBuffers;
};

type GLSizeData = {
  width: number;
  height: number;
};

type GLWallpaperData = {
  textures: GLTextures;
  intensity: number;
  colors:
  | [Color]
  | [Color, Color]
  | [Color, Color, Color]
  | [Color, Color, Color, Color];
};

type Never<T> = {
  [x in keyof T]?: never;
};

export type GLData = GLDataBase & (GLWallpaperData | Never<GLWallpaperData>) & (GLSizeData | Never<GLSizeData>);
export type GLDataFull = GLDataBase & GLWallpaperData & GLSizeData;

export type SceneData = {
  positions: Position[];
};

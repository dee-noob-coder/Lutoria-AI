import { GradeParams } from "../types";

export class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private width: number = 0;
  private height: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) throw new Error("WebGL not supported");
    this.gl = gl;
    this.initShaders();
  }

  private initShaders() {
    const vsSource = `
      attribute vec2 position;
      attribute vec2 texCoord;
      varying vec2 vTexCoord;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
        vTexCoord = texCoord;
      }
    `;

    // Fragment Shader: Implements Reinhard Color Transfer + CDL + Temp/Tint
    const fsSource = `
      precision mediump float;
      varying vec2 vTexCoord;
      uniform sampler2D u_image;

      // Stats for Color Transfer
      uniform vec3 u_src_mean;
      uniform vec3 u_src_std;
      uniform vec3 u_tgt_mean;
      uniform vec3 u_tgt_std;
      uniform float u_mix_stats; // 0.0 to 1.0

      // CDL Parameters
      uniform vec3 u_lift;
      uniform vec3 u_gamma;
      uniform vec3 u_gain;
      uniform float u_saturation;
      
      // Temp/Tint
      uniform float u_temperature;
      uniform float u_tint;

      vec3 rgb2lms(vec3 rgb) {
        mat3 m = mat3(
          0.3811, 0.5783, 0.0402,
          0.1967, 0.7244, 0.0782,
          0.0241, 0.1288, 0.8444
        );
        return m * rgb;
      }

      vec3 adjust_temperature(vec3 color, float temp, float tint) {
         // Simple WB approximation
         color.r += temp;
         color.b -= temp;
         color.g += tint;
         return color;
      }

      vec3 apply_cdl(vec3 color, vec3 lift, vec3 gamma, vec3 gain) {
         color = pow(max(color * gain + lift, 0.0), 1.0 / max(gamma, vec3(0.01)));
         return color;
      }

      void main() {
        vec4 texColor = texture2D(u_image, vTexCoord);
        vec3 color = texColor.rgb;

        // 1. Statistical Color Transfer (Reinhard-ish in RGB for speed/mood)
        // New = (Old - Mean_Src) * (Std_Tgt / Std_Src) + Mean_Tgt
        if (u_mix_stats > 0.0) {
            vec3 statsColor = (color - u_src_mean) * (u_tgt_std / max(u_src_std, vec3(0.001))) + u_tgt_mean;
            color = mix(color, statsColor, u_mix_stats);
        }

        // 2. Temperature / Tint
        color = adjust_temperature(color, u_temperature, u_tint);

        // 3. CDL (Lift/Gamma/Gain)
        color = apply_cdl(color, u_lift, u_gamma, u_gain);

        // 4. Saturation
        float gray = dot(color, vec3(0.299, 0.587, 0.114));
        color = mix(vec3(gray), color, u_saturation);

        gl_FragColor = vec4(color, texColor.a);
      }
    `;

    const vs = this.compileShader(this.gl.VERTEX_SHADER, vsSource);
    const fs = this.compileShader(this.gl.FRAGMENT_SHADER, fsSource);
    
    this.program = this.gl.createProgram();
    if (!this.program || !vs || !fs) return;
    
    this.gl.attachShader(this.program, vs);
    this.gl.attachShader(this.program, fs);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('Shader program init failed:', this.gl.getProgramInfoLog(this.program));
      return;
    }

    this.gl.useProgram(this.program);
    this.setupBuffers();
  }

  private compileShader(type: number, source: string) {
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile failed:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private setupBuffers() {
    if (!this.program) return;
    
    // Quad covering the whole screen
    const vertices = new Float32Array([
      -1.0, -1.0,  0.0, 1.0,
       1.0, -1.0,  1.0, 1.0,
      -1.0,  1.0,  0.0, 0.0,
       1.0,  1.0,  1.0, 0.0,
    ]);

    const vbuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    const posLoc = this.gl.getAttribLocation(this.program, 'position');
    const texLoc = this.gl.getAttribLocation(this.program, 'texCoord');

    this.gl.vertexAttribPointer(posLoc, 2, this.gl.FLOAT, false, 4 * 4, 0);
    this.gl.enableVertexAttribArray(posLoc);

    this.gl.vertexAttribPointer(texLoc, 2, this.gl.FLOAT, false, 4 * 4, 2 * 4);
    this.gl.enableVertexAttribArray(texLoc);
  }

  public render(image: HTMLImageElement, params: GradeParams) {
    if (!this.program) return;
    
    // Resize canvas to match image (or max texture size)
    // Limit max resolution for performance if needed, but GPU is fast.
    if (this.width !== image.naturalWidth || this.height !== image.naturalHeight) {
        this.width = image.naturalWidth;
        this.height = image.naturalHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.gl.viewport(0, 0, this.width, this.height);
    }

    // Load Texture
    if (!this.texture) {
        this.texture = this.gl.createTexture();
    }
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);

    // Set Uniforms
    const uLoc = (name: string) => this.gl.getUniformLocation(this.program!, name);

    // Stats
    const srcMean = params.sourceStats?.mean || [0.5, 0.5, 0.5];
    const srcStd = params.sourceStats?.std || [0.2, 0.2, 0.2];
    const tgtMean = params.targetStats?.mean || srcMean;
    const tgtStd = params.targetStats?.std || srcStd;

    this.gl.uniform3fv(uLoc('u_src_mean'), srcMean);
    this.gl.uniform3fv(uLoc('u_src_std'), srcStd);
    this.gl.uniform3fv(uLoc('u_tgt_mean'), tgtMean);
    this.gl.uniform3fv(uLoc('u_tgt_std'), tgtStd);
    this.gl.uniform1f(uLoc('u_mix_stats'), params.mix);

    // CDL
    this.gl.uniform3fv(uLoc('u_lift'), params.lift);
    this.gl.uniform3fv(uLoc('u_gamma'), params.gamma);
    this.gl.uniform3fv(uLoc('u_gain'), params.gain);
    this.gl.uniform1f(uLoc('u_saturation'), params.saturation);
    this.gl.uniform1f(uLoc('u_temperature'), params.temperature);
    this.gl.uniform1f(uLoc('u_tint'), params.tint);

    // Draw
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}

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

    /**
     * ADVANCED CINEMATIC SHADER ENGINE v2.0
     * Features:
     * - ACES RRT Tone Mapping (Filmic Curve)
     * - Channel Crosstalk (Matrix Mixing)
     * - Luma-Weighted Saturation (Highlight Rolloff)
     * - Skin Tone Protection Masking
     * - Split Toning (Shadows/Highs)
     * - Procedural Film Grain
     */
    const fsSource = `
      precision mediump float;
      varying vec2 vTexCoord;
      uniform sampler2D u_image;
      
      // --- UNIFORMS ---
      // Stats
      uniform vec3 u_src_mean;
      uniform vec3 u_src_std;
      uniform vec3 u_tgt_mean;
      uniform vec3 u_tgt_std;
      uniform float u_mix_stats;

      // CDL
      uniform vec3 u_lift;
      uniform vec3 u_gamma;
      uniform vec3 u_gain;
      uniform float u_saturation;
      uniform float u_temperature;
      uniform float u_tint;
      
      // Cinematic
      uniform float u_contrast;
      uniform float u_vignette;
      uniform float u_grain;
      uniform float u_crosstalk;
      uniform float u_sat_rolloff;
      
      // Split Tone
      uniform vec3 u_shadow_tint;
      uniform vec3 u_highlight_tint;

      // --- UTILS ---
      
      const vec3 LUMA_COEFF = vec3(0.2126, 0.7152, 0.0722);

      float luminance(vec3 c) {
        return dot(c, LUMA_COEFF);
      }

      // Pseudo-random for grain
      float rand(vec2 co){
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
      }

      // ACES Tone Mapping (Approximation)
      // Produces the "Movie" look: soft highlight rolloff, toe compression, desaturated brights
      vec3 ACESFilm(vec3 x) {
        float a = 2.51;
        float b = 0.03;
        float c = 2.43;
        float d = 0.59;
        float e = 0.14;
        return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
      }

      vec3 adjust_temperature(vec3 color, float temp, float tint) {
         // Warmth: Add Red, Remove Blue
         color.r += temp;
         color.b -= temp;
         // Tint: Green vs Magenta
         color.g += tint;
         return color;
      }

      // Channel Crosstalk: Simulates analog film dye layers interacting
      // R affects G, G affects B, etc. Creates "muddy" but organic color mix.
      vec3 apply_crosstalk(vec3 color, float amount) {
          vec3 r = color * vec3(1.0, 0.0, 0.0);
          vec3 g = color * vec3(0.0, 1.0, 0.0);
          vec3 b = color * vec3(0.0, 0.0, 1.0);
          
          vec3 newCol = color;
          // Matrix mixing
          newCol.r = color.r + (color.g * 0.15 * amount);
          newCol.g = color.g + (color.b * 0.15 * amount);
          newCol.b = color.b + (color.r * 0.15 * amount);
          
          return mix(color, newCol, amount);
      }

      void main() {
        vec4 texColor = texture2D(u_image, vTexCoord);
        vec3 color = texColor.rgb;

        // 1. Statistical Transfer (Base Mood)
        if (u_mix_stats > 0.0) {
            vec3 statsColor = (color - u_src_mean) * (u_tgt_std / max(u_src_std, vec3(0.001))) + u_tgt_mean;
            color = mix(color, statsColor, u_mix_stats);
        }

        // 2. Film Crosstalk (Analog feel)
        color = apply_crosstalk(color, u_crosstalk);

        // 3. Temperature / Tint (White Balance)
        color = adjust_temperature(color, u_temperature, u_tint);

        // 4. CDL (Primary Grading) - Slope/Offset/Power
        // Lift (Shadow offset), Gamma (Power), Gain (Multiply)
        color = pow(max(color * u_gain + u_lift, 0.0), 1.0 / max(u_gamma, vec3(0.01)));

        // 5. Split Toning
        float lum = luminance(color);
        // Add shadow tint to dark areas (cubic smoothstep for organic blend)
        color += u_shadow_tint * (1.0 - smoothstep(0.0, 0.6, lum)) * 0.25;
        // Add highlight tint to bright areas
        color += u_highlight_tint * (smoothstep(0.4, 1.0, lum)) * 0.25;

        // 6. Filmic Saturation (Luma-Weighted)
        // Film naturally loses saturation in highlights. Digital clips.
        // We simulate film by reducing saturation as luma increases.
        float gray = luminance(color);
        
        // Calculate saturation mask based on luminance
        // u_sat_rolloff = 1.0 means heavy desaturation in highlights
        float satMask = 1.0 - (smoothstep(0.6, 1.0, lum) * u_sat_rolloff * 0.6);
        
        // Skin Tone Protection:
        // Detect skin hue (R > G > B). If skin, we want to KEEP saturation natural.
        float skinFactor = 0.0;
        if (color.r > color.g && color.g > color.b) {
            // Rough approximation of skin vector
            skinFactor = (color.r - color.b) * (color.r - color.g); 
        }
        skinFactor = clamp(skinFactor * 10.0, 0.0, 1.0);
        
        // Mix: If skin, ignore the rolloff. If sky/brights, apply rolloff.
        float finalSat = u_saturation * mix(satMask, 1.0, skinFactor * 0.8);
        
        vec3 satColor = mix(vec3(gray), color, finalSat);
        color = satColor;

        // 7. S-Curve Contrast
        // Center contrast around 0.5 gray
        vec3 contrastColor = (color - 0.5) * (1.0 + u_contrast * 0.6) + 0.5;
        color = mix(color, contrastColor, 0.8); // Blend

        // 8. ACES Tone Mapping (The "Film Look" Curve)
        color = ACESFilm(color);

        // 9. Vignette (Natural Lens Falloff)
        if (u_vignette > 0.0) {
            vec2 uv = vTexCoord * (1.0 - vTexCoord.yx);
            float vig = uv.x * uv.y * 15.0; 
            vig = pow(vig, u_vignette);
            color *= clamp(vig, 0.0, 1.0);
        }

        // 10. Film Grain (Soft Light Blend)
        if (u_grain > 0.0) {
            float noise = rand(vTexCoord + fract(u_saturation));
            vec3 grainLayer = vec3(noise);
            // Soft Light formula: (1-2a)b^2 + 2ab
            // Simplified mix for performance:
            color = mix(color, color + (grainLayer - 0.5) * 0.2, u_grain * 0.5);
        }

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
      return null;
    }
    return shader;
  }

  private setupBuffers() {
    if (!this.program) return;
    
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
    
    // Resize to max 4K or Native for performance/quality balance
    if (this.width !== image.naturalWidth || this.height !== image.naturalHeight) {
        this.width = image.naturalWidth;
        this.height = image.naturalHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.gl.viewport(0, 0, this.width, this.height);
    }

    if (!this.texture) {
        this.texture = this.gl.createTexture();
    }
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);

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
    
    // Cinematic
    this.gl.uniform1f(uLoc('u_contrast'), params.contrast);
    this.gl.uniform1f(uLoc('u_vignette'), params.vignette);
    this.gl.uniform1f(uLoc('u_grain'), params.grain);
    this.gl.uniform1f(uLoc('u_crosstalk'), params.crosstalk);
    this.gl.uniform1f(uLoc('u_sat_rolloff'), params.satRolloff);
    
    // Split
    this.gl.uniform3fv(uLoc('u_shadow_tint'), params.shadowTint);
    this.gl.uniform3fv(uLoc('u_highlight_tint'), params.highlightTint);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}

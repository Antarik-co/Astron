import { ExtendScriptMessage, ExtendScriptResult } from '../../types/index';

export class CSInterfaceBridge {
  private cs: any;

  constructor() {
    try {
      this.cs =
        typeof window !== 'undefined' && (window as any).CSInterface
          ? new (window as any).CSInterface()
          : null;
    } catch {
      this.cs = null;
    }
  }

  evalScript(script: string): Promise<ExtendScriptResult> {
    if (this.cs === null) {
      return Promise.resolve({
        success: false,
        error: 'Not in CEP environment (dev mode)',
      });
    }

    return new Promise<ExtendScriptResult>((resolve) => {
      let settled = false
      const timer = window.setTimeout(() => {
        if (!settled) {
          settled = true
          resolve({
            success: false,
            error: 'ExtendScript timed out',
          })
        }
      }, 30000)

      this.cs.evalScript(script, (result: string) => {
        if (settled) { return }
        settled = true
        window.clearTimeout(timer)

        if (typeof result !== 'string' || result.indexOf('EvalScript ') === 0 || result.indexOf('EvalScript.') === 0) {
          console.error('[Astron] ExtendScript failed:', result)
          return resolve({ success: false, error: result || 'EvalScript error' });
        }

        try {
          resolve({ success: true, data: JSON.parse(result) });
        } catch {
          resolve({ success: true, data: result });
        }
      });
    });
  }

  async testBridge(): Promise<ExtendScriptResult> {
    if (this.cs === null) {
      return { success: false, error: 'CEP bridge not available' }
    }
    return this.evalScript('"bridge_ok"')
  }

  private fetchText(url: string): Promise<string> {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest()
      xhr.open('GET', url, true)
      xhr.onload = function() {
        if (xhr.status === 0 || xhr.status === 200) {
          resolve(xhr.responseText)
        } else {
          reject(new Error('XHR ' + xhr.status + ' ' + xhr.statusText))
        }
      }
      xhr.onerror = function() {
        reject(new Error('XHR failed for ' + url))
      }
      xhr.send()
    })
  }

  async loadExtendScripts(): Promise<ExtendScriptResult> {
    if (this.cs === null) {
      return { success: false, error: 'Not in CEP environment (dev mode)' }
    }

    const extPath = this.getSystemPath('extension') || ''
    let nativePath = extPath.replace(/^file:\/\/\//i, '').replace(/\\/g, '/')

    const files = [
      'extendscript/core.jsx',
      'extendscript/effects.jsx',
      'extendscript/modules/motion.extendscript.jsx',
      'extendscript/modules/timeline.extendscript.jsx',
      'extendscript/modules/effects.extendscript.jsx',
      'extendscript/modules/rig.extendscript.jsx',
      'extendscript/modules/3d.extendscript.jsx',
      'extendscript/modules/audio.extendscript.jsx',
      'extendscript/modules/color.extendscript.jsx',
      'extendscript/modules/text.extendscript.jsx',
      'extendscript/modules/export.extendscript.jsx',
      'extendscript/modules/organize.extendscript.jsx',
      'extendscript/modules/automate.extendscript.jsx',
      'extendscript/modules/ai_studio.extendscript.jsx',
    ]

    const results: Array<{ path: string; success: boolean; error?: string }> = []

    for (const file of files) {
      const fullPath = nativePath + '/' + file
      const escapedPath = fullPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      const script = '$.evalFile(new File("' + escapedPath + '"))'

      try {
        const evalResult = await this.evalScript(script)
        if (!evalResult.success) {
          results.push({ path: file, success: false, error: evalResult.error || 'evalFile failed' })
        } else {
          results.push({ path: file, success: true })
        }
      } catch (err) {
        results.push({ path: file, success: false, error: (err as Error).message || 'evalFile threw' })
      }
    }

    const loaded = results.filter(r => r.success).length
    const errors = results.filter(r => !r.success).map(r => r.path + ': ' + r.error)

    if (loaded === 0 && errors.length > 0) {
      return { success: false, error: 'All ExtendScript files failed: ' + errors.join('; ') }
    }

    return {
      success: true,
      data: { loaded, total: files.length, errors: errors.length > 0 ? errors.join('; ') : '' }
    }
  }

  callExtendScript(message: ExtendScriptMessage): Promise<ExtendScriptResult> {
    const scriptCall = 'Astron.handle(' + JSON.stringify(message) + ')';
    return this.evalScript(scriptCall).then((result) => {
      if (!result.success) { return result; }

      const payload = result.data as any;
      if (payload && typeof payload === 'object' && typeof payload.success === 'boolean') {
        if (payload.success) {
          return { success: true, data: payload.data };
        }
        return {
          success: false,
          error: payload.error || payload.message || 'ExtendScript command failed',
        };
      }

      return result;
    });
  }

  batchEvalScript(scripts: string[]): Promise<ExtendScriptResult[]> {
    return scripts.reduce<Promise<ExtendScriptResult[]>>(
      (chain, script) =>
        chain.then((results) =>
          this.evalScript(script).then((result) => [...results, result])
        ),
      Promise.resolve([])
    );
  }

  isConnected(): boolean {
    return this.cs !== null;
  }

  getSystemPath(pathType: string): string {
    return this.cs ? this.cs.getSystemPath(pathType) : '';
  }
}

export const csBridge = new CSInterfaceBridge();

export const evalScript = (script: string): Promise<ExtendScriptResult> =>
  csBridge.evalScript(script);

export const callExtendScript = (
  msg: ExtendScriptMessage
): Promise<ExtendScriptResult> => csBridge.callExtendScript(msg);

export const loadExtendScripts = (): Promise<ExtendScriptResult> =>
  csBridge.loadExtendScripts();

export const batchEvalScript = (
  scripts: string[]
): Promise<ExtendScriptResult[]> => csBridge.batchEvalScript(scripts);

import fs from 'fs-extra';
import path from 'path';

export interface ProxyConfig {
  [path: string]: {
    target: string;
    changeOrigin: boolean;
    secure: boolean;
    rewrite?: (path: string) => string;
  };
}

export class ProxyConfigService {
  private readonly viteConfigPath = 'vite.config.ts';

  async configureProxy(domain: string): Promise<void> {
    const proxyConfig = this.generateProxyConfig(domain);
    await this.updateViteConfig(proxyConfig);
  }

  async addProxyForUrl(url: string): Promise<void> {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      await this.configureProxy(domain);
    } catch (error) {
      throw new Error(`Invalid URL provided: ${url}`);
    }
  }

  private generateProxyConfig(domain: string): ProxyConfig {
    const config: ProxyConfig = {};

    // Toronto Open Data specific configurations
    if (domain.includes('ckan0.cf.opendata.inter.prod-toronto.ca')) {
      config['/api/ckan'] = {
        target: 'https://ckan0.cf.opendata.inter.prod-toronto.ca',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/ckan/, '/api/3/action')
      };
    }

    if (domain.includes('secure.toronto.ca')) {
      config['/api/toronto'] = {
        target: 'https://secure.toronto.ca',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/toronto/, '')
      };
    }

    if (domain.includes('opendata.toronto.ca')) {
      config['/api/opendata'] = {
        target: 'https://opendata.toronto.ca',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/opendata/, '')
      };
    }

    // TTC specific
    if (domain.includes('webservices.umoiq.com')) {
      config['/api/ttc'] = {
        target: 'https://webservices.umoiq.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/ttc/, '/service')
      };
    }

    // Bike Share GBFS
    if (domain.includes('tor.publicbikesystem.net')) {
      config['/api/bikeshare'] = {
        target: 'https://tor.publicbikesystem.net',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/bikeshare/, '/ube/gbfs')
      };
    }

    return config;
  }

  private async updateViteConfig(newProxyConfig: ProxyConfig): Promise<void> {
    if (!await fs.pathExists(this.viteConfigPath)) {
      throw new Error('vite.config.ts not found');
    }

    const content = await fs.readFile(this.viteConfigPath, 'utf-8');
    const updatedContent = this.mergeProxyConfig(content, newProxyConfig);
    await fs.writeFile(this.viteConfigPath, updatedContent);
  }

  private mergeProxyConfig(viteConfigContent: string, newProxyConfig: ProxyConfig): string {
    // Parse existing proxy configuration
    const existingProxy = this.extractExistingProxy(viteConfigContent);
    const mergedProxy = { ...existingProxy, ...newProxyConfig };

    // Generate new proxy configuration string
    const proxyConfigString = this.generateProxyConfigString(mergedProxy);

    // Replace or add proxy configuration
    if (viteConfigContent.includes('proxy:')) {
      // Replace existing proxy configuration
      return viteConfigContent.replace(
        /proxy:\s*{[^}]*}/s,
        `proxy: ${proxyConfigString}`
      );
    } else {
      // Add proxy configuration to server block
      if (viteConfigContent.includes('server:')) {
        return viteConfigContent.replace(
          /server:\s*{/,
          `server: {\n    proxy: ${proxyConfigString},`
        );
      } else {
        // Add server block with proxy
        return viteConfigContent.replace(
          /export default defineConfig\(\{/,
          `export default defineConfig({\n  server: {\n    proxy: ${proxyConfigString}\n  },`
        );
      }
    }
  }

  private extractExistingProxy(content: string): ProxyConfig {
    const proxyMatch = content.match(/proxy:\s*({[^}]*})/s);
    if (!proxyMatch) return {};

    try {
      // This is a simplified extraction - in practice, you'd want a more robust parser
      const proxyString = proxyMatch[1];
      // For now, return empty object and let new config override
      return {};
    } catch {
      return {};
    }
  }

  private generateProxyConfigString(proxyConfig: ProxyConfig): string {
    const entries = Object.entries(proxyConfig).map(([path, config]) => {
      const configString = Object.entries(config)
        .map(([key, value]) => {
          if (typeof value === 'function') {
            return `${key}: ${value.toString()}`;
          }
          return `${key}: ${JSON.stringify(value)}`;
        })
        .join(',\n      ');

      return `    '${path}': {\n      ${configString}\n    }`;
    });

    return `{\n${entries.join(',\n')}\n  }`;
  }

  async getProxyUrlForOriginal(originalUrl: string): Promise<string> {
    try {
      const urlObj = new URL(originalUrl);
      const domain = urlObj.hostname;

      // Map domains to proxy paths
      if (domain.includes('ckan0.cf.opendata.inter.prod-toronto.ca')) {
        return originalUrl.replace(
          'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action',
          '/api/ckan'
        );
      }

      if (domain.includes('secure.toronto.ca')) {
        return originalUrl.replace('https://secure.toronto.ca', '/api/toronto');
      }

      if (domain.includes('webservices.umoiq.com')) {
        return originalUrl.replace(
          'https://webservices.umoiq.com/service',
          '/api/ttc'
        );
      }

      if (domain.includes('tor.publicbikesystem.net')) {
        return originalUrl.replace(
          'https://tor.publicbikesystem.net/ube/gbfs',
          '/api/bikeshare'
        );
      }

      return originalUrl;
    } catch {
      return originalUrl;
    }
  }

  async validateProxyConfiguration(): Promise<{
    configured: boolean;
    proxies: string[];
    issues: string[];
  }> {
    const issues: string[] = [];
    const proxies: string[] = [];

    try {
      if (!await fs.pathExists(this.viteConfigPath)) {
        issues.push('vite.config.ts not found');
        return { configured: false, proxies, issues };
      }

      const content = await fs.readFile(this.viteConfigPath, 'utf-8');
      
      if (!content.includes('proxy:')) {
        issues.push('No proxy configuration found in vite.config.ts');
        return { configured: false, proxies, issues };
      }

      // Extract proxy paths (simplified)
      const proxyMatches = content.match(/'([^']+)':\s*{/g);
      if (proxyMatches) {
        proxies.push(...proxyMatches.map(match => match.match(/'([^']+)'/)?.[1] || ''));
      }

      return {
        configured: proxies.length > 0,
        proxies: proxies.filter(Boolean),
        issues
      };
    } catch (error) {
      issues.push(`Error reading vite.config.ts: ${error}`);
      return { configured: false, proxies, issues };
    }
  }
} 
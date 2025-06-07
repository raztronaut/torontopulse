import { DatasetMetadata, AccessInfo, FieldMetadata } from '../types.js';

export interface CkanPackage {
  id: string;
  name: string;
  title: string;
  notes: string;
  resources: CkanResource[];
  tags: Array<{ name: string }>;
  organization?: { title: string };
  metadata_created: string;
  metadata_modified: string;
}

export interface CkanResource {
  id: string;
  name: string;
  description: string;
  format: string;
  url: string;
  datastore_active: boolean;
  size?: number;
  last_modified?: string;
}

export class CkanApiService {
  private readonly baseUrl = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action';

  async discoverDataset(url: string): Promise<DatasetMetadata> {
    const datasetId = this.extractDatasetId(url);
    if (!datasetId) {
      throw new Error('Could not extract dataset ID from URL');
    }

    const packageData = await this.getPackageData(datasetId);
    const bestResource = this.selectBestResource(packageData.resources);
    
    if (!bestResource) {
      throw new Error('No suitable resources found in dataset');
    }

    // Sample data to detect structure
    const sampleData = await this.sampleResourceData(bestResource);
    const fieldMetadata = this.analyzeFields(sampleData);
    
    return {
      id: packageData.name,
      name: packageData.title,
      description: packageData.notes || '',
      resourceId: bestResource.id,
      accessUrl: this.buildAccessUrl(bestResource),
      dataType: this.detectDataType(fieldMetadata),
      geoFields: fieldMetadata.filter(f => f.semanticType === 'location').map(f => f.name),
      timeFields: fieldMetadata.filter(f => f.semanticType === 'date').map(f => f.name),
      valueFields: fieldMetadata,
      updateFrequency: this.detectUpdateFrequency(packageData),
      corsRequired: this.requiresCors(bestResource.url),
      tags: packageData.tags.map(t => t.name),
      organization: packageData.organization?.title || 'City of Toronto',
      lastModified: bestResource.last_modified || packageData.metadata_modified,
      format: bestResource.format.toLowerCase(),
      size: bestResource.size
    };
  }

  async validateResourceAccess(resourceId: string): Promise<AccessInfo> {
    try {
      // Test datastore API first
      const datastoreUrl = `${this.baseUrl}/datastore_search?resource_id=${resourceId}&limit=1`;
      const datastoreResponse = await fetch(datastoreUrl);
      
      if (datastoreResponse.ok) {
        const data = await datastoreResponse.json();
        return {
          accessible: true,
          method: 'datastore',
          url: datastoreUrl.replace('&limit=1', ''),
          format: 'json',
          corsRequired: false,
          sampleData: data.result?.records?.[0] || null
        };
      }

      // Fallback to direct resource URL
      const resource = await this.getResourceData(resourceId);
      const directResponse = await fetch(resource.url, { method: 'HEAD' });
      
      return {
        accessible: directResponse.ok,
        method: 'direct',
        url: resource.url,
        format: resource.format.toLowerCase(),
        corsRequired: this.requiresCors(resource.url),
        sampleData: null
      };
    } catch (error) {
      return {
        accessible: false,
        method: 'unknown',
        url: '',
        format: 'unknown',
        corsRequired: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private extractDatasetId(url: string): string | null {
    // Handle various Toronto Open Data URL formats
    const patterns = [
      /open\.toronto\.ca\/dataset\/([^\/\?]+)/,
      /ckan.*\/dataset\/([^\/\?]+)/,
      /\/dataset\/([^\/\?]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  private async getPackageData(datasetId: string): Promise<CkanPackage> {
    const response = await fetch(`${this.baseUrl}/package_show?id=${datasetId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch package data: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(`CKAN API error: ${data.error?.message || 'Unknown error'}`);
    }
    
    return data.result;
  }

  private async getResourceData(resourceId: string): Promise<CkanResource> {
    const response = await fetch(`${this.baseUrl}/resource_show?id=${resourceId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch resource data: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.result;
  }

  private selectBestResource(resources: CkanResource[]): CkanResource | null {
    // Priority: JSON with datastore > CSV with datastore > JSON > CSV > others
    const priorities = {
      'json': 100,
      'csv': 80,
      'geojson': 90,
      'xml': 60,
      'xlsx': 40,
      'xls': 30
    };

    return resources
      .filter(r => r.format && priorities[r.format.toLowerCase()] !== undefined)
      .sort((a, b) => {
        const aScore = (priorities[a.format.toLowerCase()] || 0) + (a.datastore_active ? 20 : 0);
        const bScore = (priorities[b.format.toLowerCase()] || 0) + (b.datastore_active ? 20 : 0);
        return bScore - aScore;
      })[0] || null;
  }

  private async sampleResourceData(resource: CkanResource): Promise<any[]> {
    try {
      if (resource.datastore_active) {
        const response = await fetch(
          `${this.baseUrl}/datastore_search?resource_id=${resource.id}&limit=5`
        );
        const data = await response.json();
        return data.result?.records || [];
      } else {
        // For direct URLs, we'd need to handle different formats
        // For now, return empty array and rely on user input
        return [];
      }
    } catch (error) {
      console.warn('Could not sample resource data:', error);
      return [];
    }
  }

  private analyzeFields(sampleData: any[]): FieldMetadata[] {
    if (!sampleData.length) return [];

    const fields = Object.keys(sampleData[0]);
    return fields.map(fieldName => {
      const values = sampleData.map(row => row[fieldName]).filter(v => v != null);
      
      return {
        name: fieldName,
        type: this.detectDataType(values),
        semanticType: this.detectSemanticType(fieldName, values),
        format: this.detectFormat(values),
        nullable: values.length < sampleData.length,
        sampleValues: values.slice(0, 3)
      };
    });
  }

  private detectDataType(values: any[]): 'string' | 'number' | 'boolean' | 'date' | 'mixed' {
    if (!values.length) return 'string';
    
    const types = new Set(values.map(v => typeof v));
    if (types.size > 1) return 'mixed';
    
    const firstType = Array.from(types)[0];
    if (firstType === 'number') return 'number';
    if (firstType === 'boolean') return 'boolean';
    
    // Check if string values are dates
    if (firstType === 'string') {
      const datePattern = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}/;
      if (values.some(v => datePattern.test(v))) return 'date';
    }
    
    return 'string';
  }

  private detectSemanticType(fieldName: string, values: any[]): string {
    const name = fieldName.toLowerCase();
    
    // Geographic patterns
    if (/lat|latitude/i.test(name)) return 'latitude';
    if (/lon|lng|longitude/i.test(name)) return 'longitude';
    if (/address|location|place/i.test(name)) return 'location';
    
    // Temporal patterns
    if (/date|time|timestamp|created|updated/i.test(name)) return 'date';
    
    // Toronto-specific patterns
    if (/beach|water/i.test(name)) return 'beach-related';
    if (/temp|temperature/i.test(name)) return 'temperature';
    if (/route|line|direction/i.test(name)) return 'transit';
    if (/ward|district|neighbourhood/i.test(name)) return 'administrative';
    
    // Quality indicators
    if (/quality|status|condition|clarity/i.test(name)) return 'quality';
    
    // Numeric indicators
    if (/count|number|amount|speed|distance|size/i.test(name)) return 'quantity';
    
    return 'generic';
  }

  private detectFormat(values: any[]): string {
    if (!values.length) return 'unknown';
    
    const sample = values[0];
    if (typeof sample === 'number') return 'numeric';
    if (typeof sample === 'boolean') return 'boolean';
    
    // String format detection
    const str = String(sample);
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return 'date-iso';
    if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) return 'date-us';
    if (/^-?\d+\.\d+$/.test(str)) return 'decimal';
    if (/^-?\d+$/.test(str)) return 'integer';
    if (/^https?:\/\//.test(str)) return 'url';
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(str)) return 'email';
    
    return 'text';
  }

  private buildAccessUrl(resource: CkanResource): string {
    if (resource.datastore_active) {
      return `${this.baseUrl}/datastore_search?resource_id=${resource.id}`;
    }
    return resource.url;
  }

  private detectDataType(fields: FieldMetadata[]): 'geospatial' | 'temporal' | 'categorical' | 'mixed' {
    const hasGeo = fields.some(f => ['latitude', 'longitude', 'location'].includes(f.semanticType));
    const hasTemporal = fields.some(f => f.semanticType === 'date');
    
    if (hasGeo && hasTemporal) return 'mixed';
    if (hasGeo) return 'geospatial';
    if (hasTemporal) return 'temporal';
    return 'categorical';
  }

  private detectUpdateFrequency(packageData: CkanPackage): string {
    const title = packageData.title.toLowerCase();
    const description = (packageData.notes || '').toLowerCase();
    const text = `${title} ${description}`;
    
    if (/real.?time|live|current/i.test(text)) return 'real-time';
    if (/daily|day/i.test(text)) return 'daily';
    if (/weekly|week/i.test(text)) return 'weekly';
    if (/monthly|month/i.test(text)) return 'monthly';
    if (/annual|year/i.test(text)) return 'annually';
    
    return 'unknown';
  }

  private requiresCors(url: string): boolean {
    try {
      const urlObj = new URL(url);
      // Toronto Open Data domains that typically require CORS
      const corsRequiredDomains = [
        'ckan0.cf.opendata.inter.prod-toronto.ca',
        'secure.toronto.ca',
        'opendata.toronto.ca'
      ];
      
      return corsRequiredDomains.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return true; // Assume CORS required if URL parsing fails
    }
  }
} 
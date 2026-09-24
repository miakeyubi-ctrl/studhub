import { Injectable } from '@angular/core';

export interface AgentProperty {
  id: number;
  agentId: string;
  title: string;
  category: string;
  city: string;
  address: string;
  price: number;
  surface: number;
  rooms: number;
  furnished: boolean;
  description: string;
  image: string;
  createdAt: number;
}

const PROPERTIES_KEY = 'studhub-agent-properties';

@Injectable({ providedIn: 'root' })
export class AgentPropertiesService {

  private properties: AgentProperty[] = this.load();

  getByAgent(agentId: string): AgentProperty[] {
    return this.properties
      .filter(p => p.agentId === agentId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getById(id: number): AgentProperty | undefined {
    return this.properties.find(p => p.id === id);
  }

  add(property: Omit<AgentProperty, 'id' | 'createdAt'>): AgentProperty {
    const created: AgentProperty = {
      ...property,
      id: Math.max(...this.properties.map(p => p.id), 0) + 1,
      createdAt: Date.now()
    };

    this.properties = [created, ...this.properties];
    this.save();

    return created;
  }

  update(id: number, changes: Partial<Omit<AgentProperty, 'id' | 'agentId' | 'createdAt'>>): void {
    this.properties = this.properties.map(p => p.id === id ? { ...p, ...changes } : p);
    this.save();
  }

  delete(id: number): void {
    this.properties = this.properties.filter(p => p.id !== id);
    this.save();
  }

  private load(): AgentProperty[] {
    const raw = localStorage.getItem(PROPERTIES_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private save(): void {
    localStorage.setItem(PROPERTIES_KEY, JSON.stringify(this.properties));
  }
}

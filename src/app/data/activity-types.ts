export type AgentActivityTypeValue =
  | 'AGENT_IMMOBILIER'
  | 'PROPRIETAIRE'
  | 'TRANSPORT'
  | 'MENAGE'
  | 'AUTRE_SERVICE';

export interface AgentActivityTypeOption {
  value: AgentActivityTypeValue;
  labelKey: string;
}

export const AGENT_ACTIVITY_TYPES: AgentActivityTypeOption[] = [
  { value: 'AGENT_IMMOBILIER', labelKey: 'AGENT_AUTH.ACTIVITY_IMMOBILIER' },
  { value: 'PROPRIETAIRE', labelKey: 'AGENT_AUTH.ACTIVITY_PROPRIETAIRE' },
  { value: 'TRANSPORT', labelKey: 'AGENT_AUTH.ACTIVITY_TRANSPORT' },
  { value: 'MENAGE', labelKey: 'AGENT_AUTH.ACTIVITY_MENAGE' },
  { value: 'AUTRE_SERVICE', labelKey: 'AGENT_AUTH.ACTIVITY_AUTRE' },
];

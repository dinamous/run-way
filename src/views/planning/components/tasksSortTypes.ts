export type SortField = 'title' | 'deadline' | 'created' | 'priority';
export type SortDirection = 'asc' | 'desc';
export type GroupBy = 'none' | 'step' | 'member' | 'status';

export interface SortState {
  sortField: SortField;
  sortDirection: SortDirection;
  groupBy: GroupBy;
}

export const EMPTY_SORT_STATE: SortState = {
  sortField: 'priority',
  sortDirection: 'asc',
  groupBy: 'none',
};

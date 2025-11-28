import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { WidgetContext } from '@home/models/widget-component.models';
import { TankAssetService, TankAsset, TankAttributes } from '../shared/services/tank-asset.service';
import { StrappingTableService } from '../shared/services/strapping-table.service';
import { StrappingTable, StrappingTableEntry } from '../shared/models/strapping-table.model';

/**
 * Componente para configuración de Strapping Tables
 * 
 * Permite:
 * - Seleccionar tanque
 * - Ver tabla actual
 * - Importar desde CSV
 * - Exportar a CSV
 * - Eliminar tabla
 * - Validar estructura
 */
@Component({
  selector: 'tb-strapping-table-config',
  templateUrl: './strapping-table-config.component.html',
  styleUrls: ['./strapping-table-config.component.scss']
})
export class StrappingTableConfigComponent implements OnInit, OnDestroy {

  @Input() ctx: WidgetContext;
  @Input() tanks: Array<{ asset: TankAsset, attributes: TankAttributes }> = [];

  // Selected tank
  selectedTankId: string = '';
  selectedTank: { asset: TankAsset, attributes: TankAttributes } | null = null;

  // Current strapping table
  currentTable: StrappingTable | null = null;
  hasTable: boolean = false;

  // Loading states
  loading: boolean = false;
  saving: boolean = false;
  error: string | null = null;
  successMessage: string | null = null;

  // Import modal state
  showImportModal: boolean = false;
  csvContent: string | null = null;
  fractionsCsvContent: string | null = null;
  importError: string | null = null;

  // Preview
  showPreviewModal: boolean = false;
  previewEntries: StrappingTableEntry[] = [];
  previewPageSize: number = 20;
  previewCurrentPage: number = 0;

  // Validation
  validationErrors: string[] = [];

  // File input reference
  fileInputRef: HTMLInputElement | null = null;

  // Edit mode
  editMode: boolean = false;
  fractionEditMode: boolean = false;
  editingIndex: number = -1;
  editedEntry: { feet: number; inches: number; volume: number } = { feet: 0, inches: 0, volume: 0 };
  originalEntries: StrappingTableEntry[] = [];

  private subscriptions: Subscription[] = [];

  constructor(
    private tankAssetService: TankAssetService,
    private strappingTableService: StrappingTableService
  ) {}

  ngOnInit(): void {
    // Auto-select first tank if available
    if (this.tanks.length > 0 && !this.selectedTankId) {
      this.selectTank(this.tanks[0].asset.id!.id);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Convert new TankShape format to legacy format used by StrappingTable
   */
  private convertToLegacyShape(shape: any): 'vertical' | 'horizontal' | 'spherical' {
    const mapping: Record<string, 'vertical' | 'horizontal' | 'spherical'> = {
      'vertical_cylinder': 'vertical',
      'horizontal_cylinder': 'horizontal',
      'spherical': 'spherical',
      'vertical': 'vertical',
      'horizontal': 'horizontal'
    };
    return mapping[shape] || 'vertical';
  }

  /**
   * Select tank and load its strapping table
   */
  selectTank(tankId: string): void {
    this.selectedTankId = tankId;
    this.selectedTank = this.tanks.find(t => t.asset.id!.id === tankId) || null;
    this.error = null;
    this.successMessage = null;
    this.validationErrors = [];

    if (this.selectedTank) {
      this.loadStrappingTable();
    }
  }

  /**
   * Load strapping table for selected tank
   */
  loadStrappingTable(): void {
    if (!this.selectedTankId) return;

    this.loading = true;
    this.error = null;

    const sub = this.strappingTableService.getStrappingTable(this.selectedTankId)
      .subscribe({
        next: (table) => {
          this.currentTable = table;
          this.hasTable = table !== null;
          this.loading = false;

          if (table) {
            // Validate loaded table
            const validation = this.strappingTableService.validateStrappingTable(table);
            this.validationErrors = validation.errors;
          }

          this.ctx.detectChanges();
        },
        error: (err) => {
          console.error('Error loading strapping table:', err);
          this.error = 'Failed to load strapping table';
          this.loading = false;
          this.ctx.detectChanges();
        }
      });

    this.subscriptions.push(sub);
  }

  /**
   * Open import modal
   */
  openImportModal(): void {
    this.showImportModal = true;
    this.csvContent = '';
    this.importError = null;
    this.ctx.detectChanges();
  }

  /**
   * Close import modal
   */
  closeImportModal(): void {
    this.showImportModal = false;
    this.csvContent = '';
    this.importError = null;
    this.ctx.detectChanges();
  }

  /**
   * Handle file selection (main table)
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    
    // Validate file type
    if (!file.name.endsWith('.csv')) {
      this.importError = 'Please select a CSV file';
      return;
    }

    // Read file
    const reader = new FileReader();
    reader.onload = (e) => {
      this.csvContent = e.target?.result as string;
      this.importError = null;
      this.ctx.detectChanges();
    };
    reader.onerror = () => {
      this.importError = 'Failed to read file';
      this.ctx.detectChanges();
    };
    reader.readAsText(file);
  }

  /**
   * Handle fractions file selection (optional)
   */
  onFractionsFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    
    // Validate file type
    if (!file.name.endsWith('.csv')) {
      this.importError = 'Please select a CSV file for fractions';
      return;
    }

    // Read file
    const reader = new FileReader();
    reader.onload = (e) => {
      this.fractionsCsvContent = e.target?.result as string;
      this.importError = null;
      this.ctx.detectChanges();
    };
    reader.onerror = () => {
      this.importError = 'Failed to read fractions file';
      this.ctx.detectChanges();
    };
    reader.readAsText(file);
  }

  /**
   * Import CSV content
   */
  importCSV(): void {
    if (!this.csvContent || !this.selectedTank) {
      this.importError = 'No CSV content to import';
      return;
    }

    this.saving = true;
    this.importError = null;

    const tankId = this.selectedTank.asset.id!.id;
    const tankTag = this.selectedTank.attributes.tankTag || this.selectedTank.asset.name;

    const sub = this.strappingTableService.importFromCSV(this.csvContent, tankId, tankTag)
      .subscribe({
        next: (table) => {
          // Import fractions if provided
          if (this.fractionsCsvContent) {
            const fractions = this.strappingTableService.importFractionsFromCSV(this.fractionsCsvContent);
            if (fractions && fractions.length > 0) {
              table.fractionTable = fractions;
            }
          }

          // Set additional metadata from tank attributes
          table.tankHeight = this.selectedTank!.attributes.tankHeight || 0;
          table.tankDiameter = this.selectedTank!.attributes.tankDiameter || 0;
          // Convert new shape format to legacy format for strapping table
          const shapeValue = this.selectedTank!.attributes.tankShape;
          table.tankShape = this.convertToLegacyShape(shapeValue) || 'vertical';

          // Validate imported table
          const validation = this.strappingTableService.validateStrappingTable(table);
          if (!validation.valid) {
            this.importError = `Validation failed: ${validation.errors.join(', ')}`;
            this.saving = false;
            this.ctx.detectChanges();
            return;
          }

          // Save table
          this.saveImportedTable(table);
        },
        error: (err) => {
          console.error('Error importing CSV:', err);
          this.importError = err.message || 'Failed to import CSV';
          this.saving = false;
          this.ctx.detectChanges();
        }
      });

    this.subscriptions.push(sub);
  }

  /**
   * Save imported table
   */
  private saveImportedTable(table: StrappingTable): void {
    const sub = this.strappingTableService.saveStrappingTable(this.selectedTankId, table)
      .subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = 'Strapping table imported successfully';
          this.closeImportModal();
          this.loadStrappingTable(); // Reload
          this.ctx.detectChanges();
        },
        error: (err) => {
          console.error('Error saving strapping table:', err);
          this.importError = 'Failed to save strapping table';
          this.saving = false;
          this.ctx.detectChanges();
        }
      });

    this.subscriptions.push(sub);
  }

  /**
   * Export current table to CSV
   */
  exportToCSV(): void {
    if (!this.currentTable) {
      this.error = 'No strapping table to export';
      return;
    }

    try {
      const csvContent = this.strappingTableService.exportToCSV(this.currentTable);
      
      // Create download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `strapping_table_${this.currentTable.tankTag}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      this.successMessage = 'Strapping table exported successfully';
      this.ctx.detectChanges();
    } catch (err) {
      console.error('Error exporting CSV:', err);
      this.error = 'Failed to export CSV';
      this.ctx.detectChanges();
    }
  }

  /**
   * Delete current table
   */
  deleteTable(): void {
    if (!this.currentTable) return;

    const tankName = this.selectedTank?.attributes.tankName || this.currentTable.tankTag;
    
    if (!confirm(`Are you sure you want to delete the strapping table for "${tankName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    this.saving = true;
    this.error = null;

    const sub = this.strappingTableService.deleteStrappingTable(this.selectedTankId)
      .subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = 'Strapping table deleted successfully';
          this.currentTable = null;
          this.hasTable = false;
          this.ctx.detectChanges();
        },
        error: (err) => {
          console.error('Error deleting strapping table:', err);
          this.error = 'Failed to delete strapping table';
          this.saving = false;
          this.ctx.detectChanges();
        }
      });

    this.subscriptions.push(sub);
  }

  /**
   * Open preview modal
   */
  openPreview(): void {
    if (!this.currentTable) return;

    this.previewEntries = this.currentTable.entries;
    this.previewCurrentPage = 0;
    this.showPreviewModal = true;
    this.ctx.detectChanges();
  }

  /**
   * Close preview modal
   */
  closePreview(): void {
    this.showPreviewModal = false;
    this.ctx.detectChanges();
  }

  /**
   * Get paginated preview entries
   */
  get paginatedPreviewEntries(): StrappingTableEntry[] {
    const start = this.previewCurrentPage * this.previewPageSize;
    const end = start + this.previewPageSize;
    return this.previewEntries.slice(start, end);
  }

  /**
   * Get total preview pages
   */
  get totalPreviewPages(): number {
    return Math.ceil(this.previewEntries.length / this.previewPageSize);
  }

  /**
   * Navigate preview page
   */
  previewNextPage(): void {
    if (this.previewCurrentPage < this.totalPreviewPages - 1) {
      this.previewCurrentPage++;
      this.ctx.detectChanges();
    }
  }

  previewPreviousPage(): void {
    if (this.previewCurrentPage > 0) {
      this.previewCurrentPage--;
      this.ctx.detectChanges();
    }
  }

  /**
   * Clear messages
   */
  clearMessages(): void {
    this.error = null;
    this.successMessage = null;
    this.ctx.detectChanges();
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  /**
   * Get available tanks for selection
   */
  get availableTanks() {
    return this.tanks.filter(t => t.asset.id?.id);
  }

  /**
   * Get volume for entry based on default factor
   */
  getVolumeForEntry(entry: StrappingTableEntry): number {
    // Usar el factor por defecto de la tabla o 260X1 como fallback
    const factor = this.currentTable?.defaultFactorCode || '260X1';
    
    switch (factor) {
      case '470X1': return entry.vol470X1 || 0;
      case '260X4': return entry.vol260X4 || 0;
      case '260X3': return entry.vol260X3 || 0;
      case '260X2': return entry.vol260X2 || 0;
      case '260X1': return entry.vol260X1 || 0;
      case '165X1': return entry.vol165X1 || 0;
      default: return entry.vol260X1 || 0;
    }
  }

  /**
   * Enable edit mode for main table
   */
  enableEditMode(): void {
    if (!this.currentTable) return;
    
    this.editMode = true;
    this.originalEntries = JSON.parse(JSON.stringify(this.currentTable.entries));
    this.openPreview();
  }

  /**
   * Enable edit mode for fraction table
   */
  enableFractionEditMode(): void {
    if (!this.currentTable) return;
    
    this.fractionEditMode = true;
    // TODO: Implementar edición de fracciones
    this.successMessage = 'Edición de fracciones próximamente';
    this.ctx.detectChanges();
  }

  /**
   * Cancel edit mode
   */
  cancelEditMode(): void {
    if (!confirm('¿Descartar todos los cambios?')) {
      return;
    }
    
    if (this.currentTable && this.originalEntries.length > 0) {
      this.currentTable.entries = this.originalEntries;
    }
    
    this.editMode = false;
    this.editingIndex = -1;
    this.originalEntries = [];
    this.ctx.detectChanges();
  }

  /**
   * Edit specific entry
   */
  editEntry(index: number): void {
    if (!this.currentTable) return;
    
    const entry = this.currentTable.entries[index];
    this.editingIndex = index;
    this.editedEntry = {
      feet: entry.feet,
      inches: entry.inches,
      volume: this.getVolumeForEntry(entry)
    };
    this.ctx.detectChanges();
  }

  /**
   * Save edited entry
   */
  saveEntry(): void {
    if (!this.currentTable || this.editingIndex < 0) return;
    
    const entry = this.currentTable.entries[this.editingIndex];
    entry.feet = this.editedEntry.feet;
    entry.inches = this.editedEntry.inches;
    
    // Actualizar el volumen en el factor correspondiente
    const factor = this.currentTable.defaultFactorCode || '260X1';
    switch (factor) {
      case '470X1': entry.vol470X1 = this.editedEntry.volume; break;
      case '260X4': entry.vol260X4 = this.editedEntry.volume; break;
      case '260X3': entry.vol260X3 = this.editedEntry.volume; break;
      case '260X2': entry.vol260X2 = this.editedEntry.volume; break;
      case '260X1': entry.vol260X1 = this.editedEntry.volume; break;
      case '165X1': entry.vol165X1 = this.editedEntry.volume; break;
    }
    
    this.editingIndex = -1;
    this.ctx.detectChanges();
  }

  /**
   * Cancel editing entry
   */
  cancelEditEntry(): void {
    this.editingIndex = -1;
    this.ctx.detectChanges();
  }

  /**
   * Delete entry
   */
  deleteEntry(index: number): void {
    if (!this.currentTable) return;
    
    if (!confirm('¿Eliminar esta entrada?')) {
      return;
    }
    
    this.currentTable.entries.splice(index, 1);
    this.previewEntries = this.currentTable.entries;
    this.ctx.detectChanges();
  }

  /**
   * Add new entry
   */
  addNewEntry(): void {
    if (!this.currentTable) return;
    
    const lastEntry = this.currentTable.entries[this.currentTable.entries.length - 1];
    const newEntry: StrappingTableEntry = {
      feet: lastEntry ? lastEntry.feet : 0,
      inches: lastEntry ? (lastEntry.inches + 1) % 12 : 0,
      medEq: 0,
      vol470X1: 0,
      vol260X4: 0,
      vol260X3: 0,
      vol260X2: 0,
      vol260X1: 0,
      vol165X1: 0
    };
    
    this.currentTable.entries.push(newEntry);
    this.previewEntries = this.currentTable.entries;
    
    // Ir a la última página
    this.previewCurrentPage = this.totalPreviewPages - 1;
    this.ctx.detectChanges();
  }

  /**
   * Save all changes
   */
  saveAllChanges(): void {
    if (!this.currentTable) return;
    
    this.saving = true;
    
    const sub = this.strappingTableService.saveStrappingTable(this.selectedTankId, this.currentTable)
      .subscribe({
        next: () => {
          this.saving = false;
          this.editMode = false;
          this.editingIndex = -1;
          this.originalEntries = [];
          this.successMessage = 'Cambios guardados exitosamente';
          this.loadStrappingTable();
          this.ctx.detectChanges();
        },
        error: (err) => {
          console.error('Error saving changes:', err);
          this.error = 'Error al guardar cambios';
          this.saving = false;
          this.ctx.detectChanges();
        }
      });
    
    this.subscriptions.push(sub);
  }
}

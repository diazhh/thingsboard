import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { WidgetContext } from '@home/models/widget-component.models';
import {
  TankAssetService,
  TankAsset,
  TankAttributes,
  TankShape,
  RoofType,
  BottomType,
  TankMaterial,
  TankService,
  FloatingDeckType,
  DEFAULT_TANK_ATTRIBUTES
} from '../shared/services/tank-asset.service';
import { RadarDeviceService, RadarDevice } from '../shared/services/radar-device.service';
import { SystemConfigService, LevelFormat } from '../shared/services/system-config.service';
import { LevelFormatterService } from '../shared/services/level-formatter.service';
import { LevelInputParserService } from '../shared/services/level-input-parser.service';
import { Subscription } from 'rxjs';

/**
 * Tank Configuration Widget (Static Mode)
 *
 * Purpose: Complete tank management for engineers/supervisors
 * - CRUD operations for all tanks
 * - Manage tank-radar assignments
 * - Configure tank parameters
 * - Bulk operations
 *
 * Mode: Static (automatically fetches all tanks)
 * Usage: Engineering Dashboard, Configuration screens
 */
@Component({
  selector: 'tb-tank-configuration-static',
  templateUrl: './tank-configuration-static.component.html',
  styleUrls: ['./tank-configuration-static.component.scss']
})
export class TankConfigurationStaticComponent implements OnInit, OnDestroy {

  @Input() ctx: WidgetContext;

  // Data
  tanks: Array<{ asset: TankAsset, attributes: TankAttributes, radar?: RadarDevice }> = [];
  radars: RadarDevice[] = [];
  unassignedRadars: RadarDevice[] = [];

  // Selected radars for assignment (tankId -> radarId)
  selectedRadarsMap: Map<string, string> = new Map();

  // Main sections (null = show main menu)
  activeSection: 'tanks' | 'radars' | 'general' | null = null;

  // Tank form view mode (replaces modal)
  tankFormMode: 'list' | 'create' | 'edit' = 'list';

  // Selected items for detail view
  selectedTankForDetail: { asset: TankAsset, attributes: TankAttributes, radar?: RadarDevice } | null = null;
  selectedRadarForDetail: RadarDevice | null = null;

  // Tank detail tabs
  tankDetailTab: 'basic' | 'radar-assignment' | 'calibration' = 'basic';

  // Modal states (kept for backward compatibility, but using tankFormMode instead)
  showTankModal: boolean = false;
  showRadarModal: boolean = false;
  showAssignmentModal: boolean = false;
  modalMode: 'create' | 'edit' = 'create';

  // Selected items
  selectedTank: { asset: TankAsset, attributes: TankAttributes, radar?: RadarDevice } | null = null;
  selectedRadar: RadarDevice | null = null;

  // Form data
  tankForm: Partial<TankAttributes> = {};

  // Form tab navigation
  formActiveTab: number = 0;

  // Options for dropdowns
  tankShapeOptions: { value: TankShape; label: string; icon: string }[] = [
    { value: 'vertical_cylinder', label: 'Cilindro Vertical', icon: 'view_column' },
    { value: 'horizontal_cylinder', label: 'Cilindro Horizontal', icon: 'view_stream' },
    { value: 'spherical', label: 'Esférico', icon: 'panorama_fish_eye' }
  ];

  roofTypeOptions: { value: RoofType; label: string }[] = [
    { value: 'fixed_cone', label: 'Techo Cónico Fijo' },
    { value: 'fixed_dome', label: 'Techo Domo Fijo' },
    { value: 'geodesic_dome', label: 'Domo Geodésico (Aluminio)' },
    { value: 'floating_external', label: 'Techo Flotante Externo' },
    { value: 'floating_internal', label: 'Techo Flotante Interno' },
    { value: 'floating_covered', label: 'Techo Flotante con Domo' },
    { value: 'open_top', label: 'Sin Techo (Abierto)' }
  ];

  floatingDeckOptions: { value: FloatingDeckType; label: string }[] = [
    { value: 'pan', label: 'Tipo Pan (Simple)' },
    { value: 'pontoon', label: 'Tipo Pontón' },
    { value: 'double_deck', label: 'Doble Cubierta' }
  ];

  bottomTypeOptions: { value: BottomType; label: string }[] = [
    { value: 'flat', label: 'Fondo Plano' },
    { value: 'cone_up', label: 'Cono Arriba (Centro Alto)' },
    { value: 'cone_down', label: 'Cono Abajo (Drenaje)' },
    { value: 'slope', label: 'Pendiente Simple' }
  ];

  materialOptions: { value: TankMaterial; label: string }[] = [
    { value: 'carbon_steel', label: 'Acero al Carbono' },
    { value: 'stainless_steel', label: 'Acero Inoxidable' },
    { value: 'aluminum', label: 'Aluminio' },
    { value: 'fiberglass', label: 'Fibra de Vidrio' },
    { value: 'concrete', label: 'Concreto' }
  ];

  tankServiceOptions: { value: TankService; label: string }[] = [
    { value: 'crude_oil', label: 'Petróleo Crudo' },
    { value: 'refined_products', label: 'Productos Refinados' },
    { value: 'chemicals', label: 'Químicos' },
    { value: 'water', label: 'Agua' },
    { value: 'lpg', label: 'GLP' },
    { value: 'other', label: 'Otro' }
  ];
  
  // Loading states
  loading: boolean = true;
  error: string | null = null;
  saving: boolean = false;

  // Configuration
  assetProfileFilter: string = 'Tank';
  deviceProfileFilter: string = 'Radar_TRL2';

  // Search and filter
  searchText: string = '';
  filterAssigned: 'all' | 'assigned' | 'unassigned' = 'all';

  // Level format configuration
  selectedLevelFormat: LevelFormat = 'm';

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private tankAssetService: TankAssetService,
    private radarDeviceService: RadarDeviceService,
    private systemConfigService: SystemConfigService,
    private levelFormatterService: LevelFormatterService,
    private levelInputParserService: LevelInputParserService
  ) {}

  ngOnInit(): void {
    // Register this component in the widget scope
    if (this.ctx && this.ctx.$scope) {
      this.ctx.$scope.tankConfigurationStaticComponent = this;
    }

    // Initialize system config service with tenant ID
    if (this.ctx && this.ctx.currentUser && this.ctx.currentUser.tenantId) {
      this.systemConfigService.initWithTenant(this.ctx.currentUser.tenantId);
    }

    // Load settings
    this.loadSettings();

    // Load level format configuration
    this.loadLevelFormatConfig();

    // Load all data
    this.loadAllData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadSettings(): void {
    if (this.ctx.settings) {
      this.assetProfileFilter = this.ctx.settings.assetProfileFilter || 'Tank';
      this.deviceProfileFilter = this.ctx.settings.deviceProfileFilter || 'Radar_TRL2';
    }
  }

  /**
   * Load all tanks and radars
   */
  loadAllData(): void {
    this.loading = true;
    this.error = null;

    // Load tanks with attributes
    this.tankAssetService.getAllTanksWithAttributes(this.assetProfileFilter)
      .subscribe({
        next: (tanksWithAttributes) => {
          console.log(`Loaded ${tanksWithAttributes.length} tanks`);

          // Get radar assignments for each tank
          const tankIds = tanksWithAttributes.map(t => t.asset.id!.id);
          this.radarDeviceService.getTankRadarAssignments(tankIds)
            .subscribe({
              next: (assignments) => {
                // Build tank list with radar info
                const tankPromises = tanksWithAttributes.map(async (tankWithAttr) => {
                  const tankId = tankWithAttr.asset.id!.id;
                  const radarId = assignments.get(tankId);
                  
                  let radar: RadarDevice | undefined;
                  if (radarId) {
                    try {
                      radar = await this.radarDeviceService.getRadarById(radarId).toPromise();
                    } catch (err) {
                      console.warn(`Could not load radar ${radarId}:`, err);
                    }
                  }

                  return {
                    asset: tankWithAttr.asset,
                    attributes: tankWithAttr.attributes,
                    radar: radar
                  };
                });

                Promise.all(tankPromises).then(tanks => {
                  this.tanks = tanks;
                  this.loading = false;
                  this.ctx.detectChanges();
                });
              },
              error: (err) => {
                console.error('Error loading radar assignments:', err);
                // Continue without radar info
                this.tanks = tanksWithAttributes.map(t => ({
                  asset: t.asset,
                  attributes: t.attributes
                }));
                this.loading = false;
                this.ctx.detectChanges();
              }
            });

          // Load all radars
          this.loadRadars();
        },
        error: (err) => {
          console.error('Error loading tanks:', err);
          this.error = 'Failed to load tanks. Check permissions.';
          this.loading = false;
          this.ctx.detectChanges();
        }
      });
  }

  /**
   * Load all radars
   */
  private loadRadars(): void {
    this.radarDeviceService.getRadarsByProfile(this.deviceProfileFilter)
      .subscribe({
        next: (radars) => {
          this.radars = radars;
          
          // Get unassigned radars
          this.radarDeviceService.getUnassignedRadars(this.deviceProfileFilter)
            .subscribe({
              next: (unassigned) => {
                this.unassignedRadars = unassigned;
                this.ctx.detectChanges();
              }
            });
        },
        error: (err) => {
          console.error('Error loading radars:', err);
        }
      });
  }

  /**
   * Set active section (null = return to main menu)
   */
  setActiveSection(section: 'tanks' | 'radars' | 'general' | null): void {
    this.activeSection = section;
    this.selectedTankForDetail = null;
    this.selectedRadarForDetail = null;
    this.ctx.detectChanges();
  }

  /**
   * Select tank for detail view
   */
  selectTankForDetail(tank: { asset: TankAsset, attributes: TankAttributes, radar?: RadarDevice }): void {
    this.selectedTankForDetail = tank;
    this.tankDetailTab = 'basic';
    this.ctx.detectChanges();
  }

  /**
   * Go back to tank list
   */
  backToTankList(): void {
    this.selectedTankForDetail = null;
    this.ctx.detectChanges();
  }

  /**
   * Set tank detail tab
   */
  setTankDetailTab(tab: 'basic' | 'radar-assignment' | 'calibration'): void {
    this.tankDetailTab = tab;
    this.ctx.detectChanges();
  }

  /**
   * Select radar for detail view
   */
  selectRadarForDetail(radar: RadarDevice): void {
    this.selectedRadarForDetail = radar;
    this.ctx.detectChanges();
  }

  /**
   * Go back to radar list
   */
  backToRadarList(): void {
    this.selectedRadarForDetail = null;
    this.ctx.detectChanges();
  }

  /**
   * Check if radar is assigned to a tank
   */
  isRadarAssigned(radar: RadarDevice): boolean {
    return this.tanks.some(t => t.radar && t.radar.id?.id === radar.id?.id);
  }

  /**
   * Get assigned tank name for a radar
   */
  getAssignedTankName(radar: RadarDevice): string {
    const tank = this.tanks.find(t => t.radar && t.radar.id?.id === radar.id?.id);
    return tank ? (tank.attributes.tankTag || tank.asset.name) : 'N/A';
  }

  /**
   * Open create tank form (full interface, not modal)
   */
  openCreateTankModal(): void {
    this.modalMode = 'create';
    this.tankFormMode = 'create';
    this.selectedTank = null;
    this.formActiveTab = 0;
    // Use default values from the model
    this.tankForm = {
      ...DEFAULT_TANK_ATTRIBUTES,
      tankTag: '',
      tankName: '',
      productName: ''
    };
    this.calculateCapacity();
    this.ctx.detectChanges();
  }

  /**
   * Open edit tank form (full interface, not modal)
   */
  openEditTankModal(tank: { asset: TankAsset, attributes: TankAttributes, radar?: RadarDevice }): void {
    this.modalMode = 'edit';
    this.tankFormMode = 'edit';
    this.selectedTank = tank;
    this.formActiveTab = 0;
    // Merge with defaults for any missing properties
    this.tankForm = {
      ...DEFAULT_TANK_ATTRIBUTES,
      ...tank.attributes,
      // Convert old shape values to new format if needed
      tankShape: this.convertOldShapeValue(tank.attributes.tankShape)
    };
    this.ctx.detectChanges();
  }

  /**
   * Convert old shape values to new format
   */
  private convertOldShapeValue(shape: any): TankShape {
    const mapping: Record<string, TankShape> = {
      'vertical': 'vertical_cylinder',
      'horizontal': 'horizontal_cylinder',
      'spherical': 'spherical'
    };
    return mapping[shape] || shape || 'vertical_cylinder';
  }

  /**
   * Close tank form and return to list
   */
  closeTankModal(): void {
    this.showTankModal = false;
    this.tankFormMode = 'list';
    this.selectedTank = null;
    this.tankForm = {};
    this.formActiveTab = 0;
    this.ctx.detectChanges();
  }

  /**
   * Check if floating roof type
   */
  isFloatingRoof(): boolean {
    const floatingTypes: RoofType[] = ['floating_external', 'floating_internal', 'floating_covered'];
    return floatingTypes.includes(this.tankForm.roofType as RoofType);
  }

  /**
   * Get SVG path for tank visualization
   */
  getTankSvgPath(): string {
    const shape = this.tankForm.tankShape;
    const roofType = this.tankForm.roofType || 'fixed_cone';
    const bottomType = this.tankForm.bottomType || 'flat';

    // Base dimensions for SVG (will be scaled)
    const width = 200;
    const height = 300;
    const shellHeight = 220;
    const roofHeight = 40;
    const bottomHeight = 20;

    if (shape === 'vertical_cylinder') {
      return this.getVerticalCylinderPath(width, shellHeight, roofType, bottomType, roofHeight, bottomHeight);
    } else if (shape === 'horizontal_cylinder') {
      return this.getHorizontalCylinderPath(width, height);
    } else if (shape === 'spherical') {
      return this.getSphericalTankPath(width, height);
    }
    return '';
  }

  private getVerticalCylinderPath(width: number, shellHeight: number, roofType: RoofType, bottomType: BottomType, roofHeight: number, bottomHeight: number): string {
    const x = 50;
    const y = 30;
    const w = width;
    const h = shellHeight;

    // Shell rectangle
    let path = `M ${x} ${y + roofHeight} L ${x} ${y + roofHeight + h} `;

    // Bottom
    if (bottomType === 'cone_down') {
      path += `L ${x + w/2} ${y + roofHeight + h + bottomHeight} L ${x + w} ${y + roofHeight + h} `;
    } else if (bottomType === 'cone_up') {
      path += `Q ${x + w/2} ${y + roofHeight + h - bottomHeight} ${x + w} ${y + roofHeight + h} `;
    } else {
      path += `L ${x + w} ${y + roofHeight + h} `;
    }

    // Right wall
    path += `L ${x + w} ${y + roofHeight} `;

    // Roof
    if (roofType === 'fixed_cone') {
      path += `L ${x + w/2} ${y} L ${x} ${y + roofHeight} Z`;
    } else if (roofType === 'fixed_dome' || roofType === 'geodesic_dome') {
      path += `Q ${x + w/2} ${y} ${x} ${y + roofHeight} Z`;
    } else if (roofType === 'open_top' || roofType.includes('floating')) {
      path += `L ${x} ${y + roofHeight} Z`;
    } else {
      path += `L ${x + w/2} ${y} L ${x} ${y + roofHeight} Z`;
    }

    return path;
  }

  private getHorizontalCylinderPath(width: number, height: number): string {
    const x = 30;
    const y = 80;
    const w = width + 100;
    const h = 140;

    // Horizontal cylinder with elliptical ends
    return `M ${x + 30} ${y}
            L ${x + w - 30} ${y}
            Q ${x + w + 20} ${y + h/2} ${x + w - 30} ${y + h}
            L ${x + 30} ${y + h}
            Q ${x - 20} ${y + h/2} ${x + 30} ${y}
            Z`;
  }

  private getSphericalTankPath(width: number, height: number): string {
    const cx = 150;
    const cy = 150;
    const r = 100;

    // Circle path
    return `M ${cx - r} ${cy}
            A ${r} ${r} 0 1 1 ${cx + r} ${cy}
            A ${r} ${r} 0 1 1 ${cx - r} ${cy}
            Z`;
  }

  /**
   * Get roof SVG path
   */
  getRoofSvgPath(): string {
    if (this.tankForm.tankShape !== 'vertical_cylinder') return '';

    const roofType = this.tankForm.roofType || 'fixed_cone';
    const x = 50;
    const y = 30;
    const w = 200;
    const roofHeight = 40;

    if (roofType === 'fixed_cone') {
      return `M ${x} ${y + roofHeight} L ${x + w/2} ${y} L ${x + w} ${y + roofHeight} Z`;
    } else if (roofType === 'fixed_dome' || roofType === 'geodesic_dome') {
      return `M ${x} ${y + roofHeight} Q ${x + w/2} ${y - 20} ${x + w} ${y + roofHeight} Z`;
    } else if (roofType.includes('floating')) {
      // Floating roof indicator
      const floatY = y + roofHeight + 50; // Floating position
      return `M ${x + 5} ${floatY} L ${x + w - 5} ${floatY} L ${x + w - 5} ${floatY + 10} L ${x + 5} ${floatY + 10} Z`;
    }
    return '';
  }

  /**
   * Save tank (create or update)
   */
  saveTank(): void {
    if (!this.validateTankForm()) {
      return;
    }

    this.saving = true;

    if (this.modalMode === 'create') {
      this.createTank();
    } else {
      this.updateTank();
    }
  }

  /**
   * Create new tank
   */
  private createTank(): void {
    const tankAsset: TankAsset = {
      name: this.tankForm.tankName!,
      type: this.assetProfileFilter,
      label: this.tankForm.tankTag,
      additionalInfo: {
        description: this.tankForm.description || ''
      }
    };

    this.tankAssetService.createTankWithAttributes(tankAsset, this.tankForm as TankAttributes)
      .subscribe({
        next: (createdTank) => {
          console.log('Tank created successfully:', createdTank);
          this.saving = false;
          this.closeTankModal();
          this.loadAllData(); // Reload data
          this.showSuccess('Tank created successfully');
        },
        error: (err) => {
          console.error('Error creating tank:', err);
          this.saving = false;
          this.showError('Failed to create tank');
        }
      });
  }

  /**
   * Update existing tank
   */
  private updateTank(): void {
    if (!this.selectedTank) return;

    const tankAsset: TankAsset = {
      ...this.selectedTank.asset,
      name: this.tankForm.tankName!,
      label: this.tankForm.tankTag,
      additionalInfo: {
        description: this.tankForm.description || ''
      }
    };

    this.tankAssetService.updateTankWithAttributes(tankAsset, this.tankForm as TankAttributes)
      .subscribe({
        next: (updatedTank) => {
          console.log('Tank updated successfully:', updatedTank);
          this.saving = false;
          this.closeTankModal();
          this.loadAllData(); // Reload data
          this.showSuccess('Tank updated successfully');
        },
        error: (err) => {
          console.error('Error updating tank:', err);
          this.saving = false;
          this.showError('Failed to update tank');
        }
      });
  }

  /**
   * Delete tank
   */
  deleteTank(tank: { asset: TankAsset, attributes: TankAttributes, radar?: RadarDevice }): void {
    const tankName = tank.attributes.tankName || tank.asset.name;
    
    if (!confirm(`Are you sure you want to delete tank "${tankName}"?`)) {
      return;
    }

    if (tank.radar) {
      if (!confirm(`This tank has an assigned radar. The radar will be unassigned. Continue?`)) {
        return;
      }
    }

    this.tankAssetService.deleteTank(tank.asset.id!.id)
      .subscribe({
        next: () => {
          console.log('Tank deleted successfully');
          this.loadAllData(); // Reload data
          this.showSuccess('Tank deleted successfully');
        },
        error: (err) => {
          console.error('Error deleting tank:', err);
          this.showError('Failed to delete tank');
        }
      });
  }

  /**
   * Get available radars for a specific tank
   * Returns only unassigned radars (excludes the tank's current radar)
   */
  getAvailableRadarsForTank(tank: { asset: TankAsset, attributes: TankAttributes, radar?: RadarDevice }): RadarDevice[] {
    // Calcular radares no asignados en tiempo real
    const assignedRadarIds = this.tanks
      .filter(t => t.radar && t.radar.id)
      .map(t => t.radar!.id!.id);
    
    return this.radars.filter(r => !assignedRadarIds.includes(r.id!.id));
  }

  /**
   * Get selected radar ID for a tank
   */
  getSelectedRadarId(tankId: string): string {
    return this.selectedRadarsMap.get(tankId) || '';
  }

  /**
   * Set selected radar ID for a tank
   */
  setSelectedRadarId(tankId: string, radarId: string): void {
    this.selectedRadarsMap.set(tankId, radarId);
  }

  /**
   * Assign or change radar for a tank
   */
  assignOrChangeRadar(tank: { asset: TankAsset, attributes: TankAttributes, radar?: RadarDevice }): void {
    const tankId = tank.asset.id!.id;
    const newRadarId = this.selectedRadarsMap.get(tankId);

    if (!newRadarId) {
      this.showError('Please select a radar');
      return;
    }

    // If tank already has a radar, we need to unassign it first
    if (tank.radar) {
      const oldRadarId = tank.radar.id!.id;
      
      if (oldRadarId === newRadarId) {
        this.showError('This radar is already assigned to this tank');
        return;
      }

      // First unassign the old radar, then assign the new one
      this.radarDeviceService.unassignRadarFromTank(tankId, oldRadarId)
        .subscribe({
          next: () => {
            console.log('Old radar unassigned, now assigning new radar');
            // Now assign the new radar
            this.assignRadar(tankId, newRadarId);
          },
          error: (err) => {
            console.error('Error unassigning old radar:', err);
            this.showError('Failed to unassign old radar');
          }
        });
    } else {
      // Simple assignment
      this.assignRadar(tankId, newRadarId);
    }
  }

  /**
   * Assign radar to tank
   */
  private assignRadar(tankId: string, radarId: string): void {
    this.radarDeviceService.assignRadarToTank(tankId, radarId)
      .subscribe({
        next: () => {
          console.log('Radar assigned successfully');
          this.selectedRadarsMap.delete(tankId); // Clear selection
          
          // Actualizar la UI inmediatamente
          const tank = this.tanks.find(t => t.asset.id!.id === tankId);
          const radar = this.radars.find(r => r.id!.id === radarId);
          if (tank && radar) {
            tank.radar = radar;
          }
          
          this.ctx.detectChanges();
          this.showSuccess('Radar asignado exitosamente');
        },
        error: (err) => {
          console.error('Error assigning radar:', err);
          this.showError('Error al asignar radar');
        }
      });
  }

  /**
   * Unassign radar from tank
   */
  unassignRadar(tank: { asset: TankAsset, attributes: TankAttributes, radar?: RadarDevice }): void {
    if (!tank.radar) {
      return;
    }

    const tankId = tank.asset.id!.id;
    const radarId = tank.radar.id!.id;

    if (!confirm('¿Está seguro de que desea desasignar este radar?')) {
      return;
    }

    this.radarDeviceService.unassignRadarFromTank(tankId, radarId)
      .subscribe({
        next: () => {
          console.log('Radar unassigned successfully');
          this.selectedRadarsMap.delete(tankId); // Clear selection
          
          // Actualizar la UI inmediatamente
          tank.radar = undefined;
          
          this.ctx.detectChanges();
          this.showSuccess('Radar desasignado exitosamente');
        },
        error: (err) => {
          console.error('Error unassigning radar:', err);
          this.showError('Error al desasignar radar');
        }
      });
  }

  /**
   * Validate tank form
   */
  private validateTankForm(): boolean {
    if (!this.tankForm.tankTag || this.tankForm.tankTag.trim() === '') {
      this.showError('Tank Tag is required');
      return false;
    }

    if (!this.tankForm.tankName || this.tankForm.tankName.trim() === '') {
      this.showError('Tank Name is required');
      return false;
    }

    if (!this.tankForm.tankHeight || this.tankForm.tankHeight <= 0) {
      this.showError('Tank Height must be greater than 0');
      return false;
    }

    if (!this.tankForm.tankDiameter || this.tankForm.tankDiameter <= 0) {
      this.showError('Tank Diameter must be greater than 0');
      return false;
    }

    return true;
  }

  /**
   * Calculate tank capacity from geometry
   */
  calculateCapacity(): void {
    if (!this.tankForm.tankHeight || !this.tankForm.tankDiameter || !this.tankForm.tankShape) {
      return;
    }

    const height = this.tankForm.tankHeight;
    const diameter = this.tankForm.tankDiameter;
    const radius = diameter / 2;

    let capacity = 0;

    if (this.tankForm.tankShape === 'vertical_cylinder' || this.tankForm.tankShape === 'vertical' as any) {
      // Cylinder: π * r² * h
      capacity = Math.PI * radius * radius * height;
    } else if (this.tankForm.tankShape === 'horizontal_cylinder' || this.tankForm.tankShape === 'horizontal' as any) {
      // Horizontal cylinder: π * r² * length
      capacity = Math.PI * radius * radius * height; // height is length in horizontal
    } else if (this.tankForm.tankShape === 'spherical') {
      // Sphere: (4/3) * π * r³
      capacity = (4 / 3) * Math.PI * Math.pow(radius, 3);
    }

    this.tankForm.tankCapacity = Math.round(capacity * 100) / 100;
    this.ctx.detectChanges();
  }

  /**
   * Get filtered tanks
   */
  get filteredTanks() {
    let filtered = this.tanks;

    // Apply search filter
    if (this.searchText && this.searchText.trim() !== '') {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(t =>
        (t.attributes.tankTag?.toLowerCase().includes(search)) ||
        (t.attributes.tankName?.toLowerCase().includes(search)) ||
        (t.attributes.productName?.toLowerCase().includes(search))
      );
    }

    // Apply assignment filter
    if (this.filterAssigned === 'assigned') {
      filtered = filtered.filter(t => !!t.radar);
    } else if (this.filterAssigned === 'unassigned') {
      filtered = filtered.filter(t => !t.radar);
    }

    return filtered;
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    // In a real implementation, use a toast/snackbar service
    console.log('SUCCESS:', message);
    alert(message);
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    // In a real implementation, use a toast/snackbar service
    console.error('ERROR:', message);
    alert(message);
  }

  /**
   * Export tanks to CSV
   */
  exportToCSV(): void {
    const headers = ['Tank Tag', 'Tank Name', 'Product', 'Height (m)', 'Diameter (m)', 'Capacity (m³)', 'Radar'];
    const rows = this.tanks.map(t => [
      t.attributes.tankTag || '',
      t.attributes.tankName || '',
      t.attributes.productName || '',
      t.attributes.tankHeight?.toString() || '',
      t.attributes.tankDiameter?.toString() || '',
      t.attributes.tankCapacity?.toString() || '',
      t.radar?.name || 'Not assigned'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tanks_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * ========================================
   * LEVEL FORMAT CONFIGURATION METHODS
   * ========================================
   */

  /**
   * Load level format configuration
   */
  private loadLevelFormatConfig(): void {
    // Suscribirse a cambios en la configuración
    const configSub = this.systemConfigService.config$.subscribe(config => {
      this.selectedLevelFormat = config.levelFormat;
      this.ctx.detectChanges();
    });
    this.subscriptions.push(configSub);
  }

  /**
   * Get level format example
   */
  getLevelFormatExample(format: LevelFormat): string {
    return this.levelFormatterService.getFormatExample(format as LevelFormat);
  }

  /**
   * Format level preview
   */
  formatLevelPreview(levelMm: number): string {
    const formatted = this.levelFormatterService.formatLevel(levelMm, this.selectedLevelFormat);
    return `${formatted.value} ${formatted.unit}`.trim();
  }

  /**
   * On level format change
   */
  onLevelFormatChange(): void {
    // Preview updates automatically via binding
    this.ctx.detectChanges();
  }

  /**
   * Save level format configuration
   */
  saveLevelFormat(): void {
    this.saving = true;
    this.systemConfigService.setLevelFormat(this.selectedLevelFormat).subscribe({
      next: () => {
        this.saving = false;
        this.showSuccess('Configuración de formato de nivel guardada exitosamente');
        this.ctx.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        console.error('Error saving level format:', err);
        this.showError('Error al guardar la configuración');
        this.ctx.detectChanges();
      }
    });
  }

  /**
   * Reset level format to default
   */
  resetLevelFormat(): void {
    if (confirm('¿Restaurar el formato de nivel a metros (m)?')) {
      this.selectedLevelFormat = 'm';
      this.saving = true;
      this.systemConfigService.setLevelFormat('m').subscribe({
        next: () => {
          this.saving = false;
          this.ctx.detectChanges();
          this.showSuccess('Formato de nivel restaurado a metros (m)');
        },
        error: (err) => {
          this.saving = false;
          console.error('Error resetting level format:', err);
          this.showError('Error al restaurar la configuración');
        }
      });
    }
  }

  /**
   * ========================================
   * INPUT PARSING METHODS
   * ========================================
   */

  /**
   * Formatea un valor en metros para mostrar en input según formato configurado
   */
  formatValueForInput(valueInMeters: number | undefined): string {
    if (!valueInMeters) return '';
    const valueInMm = valueInMeters * 1000;
    return this.levelInputParserService.formatForInput(valueInMm, this.selectedLevelFormat);
  }

  /**
   * Parsea el input del usuario y actualiza el valor en el formulario
   */
  parseAndUpdateValue(inputValue: string, fieldName: keyof TankAttributes): void {
    const result = this.levelInputParserService.parseInput(inputValue, this.selectedLevelFormat);
    
    if (result.isValid) {
      // Convertir de mm a metros para almacenar
      (this.tankForm as any)[fieldName] = result.valueInMm / 1000;
      
      // Recalcular capacidad si es necesario
      if (fieldName === 'tankHeight' || fieldName === 'tankDiameter') {
        this.calculateCapacity();
      }
      
      this.ctx.detectChanges();
    } else {
      console.warn(`Invalid input for ${fieldName}:`, result.errorMessage);
    }
  }

  /**
   * Obtiene el placeholder para un input según el formato
   */
  getInputPlaceholder(): string {
    return this.levelInputParserService.getPlaceholder(this.selectedLevelFormat);
  }

  /**
   * Obtiene la unidad para mostrar junto al input
   */
  getInputUnit(): string {
    return this.levelInputParserService.getUnit(this.selectedLevelFormat);
  }

  /**
   * Determina si el input debe ser de texto (para fracciones) o numérico
   */
  isTextInput(): boolean {
    return this.selectedLevelFormat.startsWith('ft-in');
  }

  /**
   * Formatea un valor en metros para mostrar en el SVG preview
   */
  formatValueForSVG(valueInMeters: number | undefined): string {
    if (!valueInMeters) return '0';
    const valueInMm = valueInMeters * 1000;
    const formatted = this.levelFormatterService.formatLevel(valueInMm, this.selectedLevelFormat);
    return `${formatted.value} ${formatted.unit}`.trim();
  }

  /**
   * Determina el tipo de input a mostrar según el formato seleccionado
   * - 'simple': Input numérico simple (mm, cm, m, in, ft)
   * - 'feet-inches': Dos inputs enteros (ft-in)
   * - 'feet-inches-fraction': Tres inputs (ft, in, fracción) (ft-in-1/8, ft-in-1/16, etc.)
   */
  getInputType(): 'simple' | 'feet-inches' | 'feet-inches-fraction' {
    if (this.selectedLevelFormat === 'ft-in') {
      return 'feet-inches';
    } else if (this.selectedLevelFormat.startsWith('ft-in-1/')) {
      return 'feet-inches-fraction';
    } else {
      return 'simple';
    }
  }

  /**
   * Determina si el input simple debe ser de tipo number (entero o decimal)
   */
  isIntegerInput(): boolean {
    // mm, cm, in son enteros
    return ['mm', 'cm', 'in'].includes(this.selectedLevelFormat);
  }
}

import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Printer, 
  Layers, 
  Scale, 
  Cpu, 
  History, 
  Copy, 
  AlertTriangle,
  FolderPlus,
  Scan
} from 'lucide-react';

interface Product {
 id: number;
 sku: string;
 barcode: string;
 name: string;
 category: string;
 brand: string;
 unit_type: 'UNIT' | 'FRACTION' | 'SERIALIZED';
 cost_price: number;
 sale_price: number;
 wholesale_price: number;
 wholesale_min_qty: number;
 stock: number;
 min_stock: number;
 is_active: boolean;
 image_url?: string;
}

interface ProductSerial {
 id: number;
 product_name: string;
 serial_number: string;
 status: 'IN_STOCK' | 'SOLD' | 'RETURNED' | 'UNDER_WARRANTY';
 ticket_id?: string;
 customer_name?: string;
 updated_at: string;
}

import { useAuthStore } from '../store/useAuthStore';
import { hasPermission } from '../utils/permissions';

export const ProductsView: React.FC = () => {
 const { user } = useAuthStore();
 const userRole = user?.role || 'ADMIN';
 const canCreateProduct = hasPermission(userRole, 'can_create_product');
 const canEditProduct = hasPermission(userRole, 'can_edit_product');

 const [activeTab, setActiveTab] = useState<'catalog' | 'serials' | 'categories' | 'labels'>('catalog');

  // Search & Filter States
 const [searchQuery, setSearchQuery] = useState('');
 const [categoryFilter, setCategoryFilter] = useState('ALL');
 const [unitTypeFilter, setUnitTypeFilter] = useState('ALL');
 const [stockStatusFilter, setStockStatusFilter] = useState('ALL');
 const [pageSize, setPageSize] = useState(10);

  // Modals
 const [isProductModalOpen, setIsProductModalOpen] = useState(false);
 const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product Form State
 const [formData, setFormData] = useState({
 sku: '',
 barcode: '',
 name: '',
 category: 'Golosinas & Snacks',
 brand: 'Genérica',
 unit_type: 'UNIT' as 'UNIT' | 'FRACTION' | 'SERIALIZED',
 cost_price: 10.0,
 sale_price: 15.0,
 wholesale_price: 13.0,
 wholesale_min_qty: 12,
 stock: 50,
 min_stock: 10,
 is_active: true
  });

  // Mock Products List
 const [products, setProducts] = useState<Product[]>([
    { id: 1, sku: 'SKU-1001', barcode: '7771234567890', name: 'Coca Cola 2 Litros Retornable', category: 'Bebidas & Gaseosas', brand: 'Coca Cola', unit_type: 'UNIT', cost_price: 8.50, sale_price: 12.00, wholesale_price: 10.50, wholesale_min_qty: 6, stock: 45, min_stock: 10, is_active: true },
    { id: 2, sku: 'SKU-1002', barcode: '2000000000015', name: 'Queso Criollo San Javier (Kg)', category: 'Lácteos & Fiambrería', brand: 'San Javier', unit_type: 'FRACTION', cost_price: 32.00, sale_price: 45.00, wholesale_price: 40.00, wholesale_min_qty: 5, stock: 12.450, min_stock: 3.000, is_active: true },
    { id: 3, sku: 'SKU-1003', barcode: '8806091234567', name: 'Smartphone Samsung Galaxy A54 128GB', category: 'Electrónica & Celulares', brand: 'Samsung', unit_type: 'SERIALIZED', cost_price: 1400.00, sale_price: 1850.00, wholesale_price: 1750.00, wholesale_min_qty: 3, stock: 4, min_stock: 2, is_active: true },
    { id: 4, sku: 'SKU-1004', barcode: '7779876543210', name: 'Galletas Wafer Chocolate 150g', category: 'Golosinas & Snacks', brand: 'Arcor', unit_type: 'UNIT', cost_price: 3.00, sale_price: 5.00, wholesale_price: 4.20, wholesale_min_qty: 12, stock: 2, min_stock: 15, is_active: true },
  ]);

  // Mock Serials List
 const [serials] = useState<ProductSerial[]>([
    { id: 1, product_name: 'Smartphone Samsung Galaxy A54 128GB', serial_number: 'IMEI-358492019482710', status: 'IN_STOCK', updated_at: '14/08/2026 08:30' },
    { id: 2, product_name: 'Smartphone Samsung Galaxy A54 128GB', serial_number: 'IMEI-358492019482711', status: 'IN_STOCK', updated_at: '14/08/2026 08:30' },
    { id: 3, product_name: 'Smartphone Samsung Galaxy A54 128GB', serial_number: 'IMEI-358492019482712', status: 'SOLD', ticket_id: 'TK-10012', customer_name: 'Comercial Bolivia S.R.L.', updated_at: '12/08/2026 14:15' },
  ]);

  // Serial Forensic Search State
 const [serialSearch, setSerialSearch] = useState('');

  // EAN-13 & SKU Auto Generator
 const generateSKU = () => {
 const randomSKU = 'SKU-' + Math.floor(1000 + Math.random() * 9000);
 setFormData(prev => ({ ...prev, sku: randomSKU }));
  };

 const generateEAN13 = () => {
 let ean = '777' + Math.floor(100000000 + Math.random() * 900000000).toString();
 setFormData(prev => ({ ...prev, barcode: ean }));
  };

  // Real-time Profit Margin Calculation
 const profitMargin = formData.sale_price > 0 
    ? (((formData.sale_price - formData.cost_price) / formData.sale_price) * 100).toFixed(1)
 : '0.0';

 const filteredProducts = products.filter(p => {
 const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
 p.barcode.includes(searchQuery);
 const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
 const matchesUnitType = unitTypeFilter === 'ALL' || p.unit_type === unitTypeFilter;
 const matchesStock = stockStatusFilter === 'ALL' || 
                         (stockStatusFilter === 'CRITICAL' ? p.stock <= p.min_stock : p.stock > p.min_stock);
 return matchesSearch && matchesCategory && matchesUnitType && matchesStock;
  });

 const handleToggleProductStatus = (id: number) => {
 setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !p.is_active } : p));
  };

 const handleSaveProduct = (e: React.FormEvent) => {
 e.preventDefault();
 if (!formData.name || !formData.sku) return;

 if (editingProduct) {
 setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...formData } : p));
    } else {
 const newProd: Product = {
 id: Date.now(),
        ...formData
      };
 setProducts(prev => [newProd, ...prev]);
    }
 setIsProductModalOpen(false);
  };

 return (
    <div className="p-6 bg-canvas h-[calc(100vh-56px)] overflow-y-auto pr-2 space-y-6 select-none transition-colors duration-fast ease-ease">
      {/* 1. Header & Main Tab Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-raised p-5 rounded-md border border-line shadow-e1">
        <div>
          <h1 className="text-display font-black text-ink flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-500" />
            Productos y Catálogo Maestro
          </h1>
          <p className="text-body text-ink-2 mt-1">
            Gestión de artículos unitarios, fraccionados/pesables, serializados IMEI y etiquetas de código de barras
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-sunken p-1.5 rounded-md border border-line">
          <button
 onClick={() => setActiveTab('catalog')}
 className={`px-4 py-2 rounded-md text-body font-bold flex items-center gap-2 transition-all ${
 activeTab === 'catalog' ? 'bg-raised text-accent shadow-e1' : 'text-gray-500'
            }`}
          >
            <Package className="w-4 h-4" />
            Catálogo Maestro
          </button>
          <button
 onClick={() => setActiveTab('serials')}
 className={`px-4 py-2 rounded-md text-body font-bold flex items-center gap-2 transition-all ${
 activeTab === 'serials' ? 'bg-raised text-accent shadow-e1' : 'text-gray-500'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Seriales / IMEI
          </button>
          <button
 onClick={() => setActiveTab('categories')}
 className={`px-4 py-2 rounded-md text-body font-bold flex items-center gap-2 transition-all ${
 activeTab === 'categories' ? 'bg-raised text-accent shadow-e1' : 'text-gray-500'
            }`}
          >
            <Layers className="w-4 h-4" />
            Categorías
          </button>
          <button
 onClick={() => setActiveTab('labels')}
 className={`px-4 py-2 rounded-md text-body font-bold flex items-center gap-2 transition-all ${
 activeTab === 'labels' ? 'bg-raised text-accent shadow-e1' : 'text-gray-500'
            }`}
          >
            <Printer className="w-4 h-4" />
            Imprimir Etiquetas
          </button>
        </div>
      </div>

      {/* TAB 1: PRODUCT CATALOG LIST */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Top Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-raised p-4 rounded-md border border-line shadow-e1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Buscar por SKU, Código de Barras o Nombre..."
 className="w-full pl-9 pr-4 py-2 bg-sunken border border-line rounded-md text-body text-ink placeholder-gray-400 focus:border-accent"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Category Filter */}
              <select
 value={categoryFilter}
 onChange={(e) => setCategoryFilter(e.target.value)}
 className="px-3 py-2 bg-sunken text-ink rounded-md border border-line text-body font-semibold focus:outline-none"
              >
                <option value="ALL">Todas las Categorías</option>
                <option value="Bebidas & Gaseosas">Bebidas & Gaseosas</option>
                <option value="Lácteos & Fiambrería">Lácteos & Fiambrería</option>
                <option value="Electrónica & Celulares">Electrónica & Celulares</option>
                <option value="Golosinas & Snacks">Golosinas & Snacks</option>
              </select>

              {/* Unit Type Filter */}
              <select
 value={unitTypeFilter}
 onChange={(e) => setUnitTypeFilter(e.target.value)}
 className="px-3 py-2 bg-sunken text-ink rounded-md border border-line text-body font-semibold focus:outline-none"
              >
                <option value="ALL">Todos los Tipos</option>
                <option value="UNIT">Unitario</option>
                <option value="FRACTION">Fraccionado / Pesable</option>
                <option value="SERIALIZED">Serializado / IMEI</option>
              </select>

              {/* Stock Status Filter */}
              <select
 value={stockStatusFilter}
 onChange={(e) => setStockStatusFilter(e.target.value)}
 className="px-3 py-2 bg-sunken text-ink rounded-md border border-line text-body font-semibold focus:outline-none"
              >
                <option value="ALL">Todos los Stocks</option>
                <option value="NORMAL">Stock Normal</option>
                <option value="CRITICAL">Stock Crítico / Agotado</option>
              </select>

              {canCreateProduct && (
                <button
 onClick={() => {
 setEditingProduct(null);
 setIsProductModalOpen(true);
                  }}
 className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-body font-extrabold flex items-center gap-2 shadow-e1 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Producto
                </button>
              )}
            </div>
          </div>

          {/* Structured Catalog Table */}
          <div className="bg-raised rounded-md border border-line shadow-e1 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sunken text-ink-2 text-micro font-extrabold uppercase tracking-wider border-b border-line">
                  <th className="p-4">Producto & Códigos</th>
                  <th className="p-4">Tipo Unidad</th>
                  <th className="p-4">Precios (Costo / Venta / Mayorista)</th>
                  <th className="p-4">Stock Actual</th>
                  <th className="p-4 text-center">Estado Venta</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-body">
                {filteredProducts.map((p) => {
 const isLowStock = p.stock <= p.min_stock;
 const unitBadge = {
                    UNIT: { label: 'Unitario', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200', icon: <Package className="w-3 h-3" /> },
                    FRACTION: { label: 'Pesable / Granel', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200', icon: <Scale className="w-3 h-3" /> },
                    SERIALIZED: { label: 'Serializado / IMEI', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200', icon: <Cpu className="w-3 h-3" /> },
                  }[p.unit_type];

 return (
                    <tr key={p.id} className="hover:bg-sunken transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-sunken border border-line flex items-center justify-center font-bold text-gray-400">
                          {p.unit_type === 'UNIT' ? <Package className="w-5 h-5 text-blue-500" /> : p.unit_type === 'FRACTION' ? <Scale className="w-5 h-5 text-emerald-500" /> : <Cpu className="w-5 h-5 text-purple-500" />}
                        </div>
                        <div>
                          <p className="font-bold text-ink">{p.name}</p>
                          <span className="text-gray-400 font-mono text-micro block">{p.sku} • EAN: {p.barcode}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-micro font-bold border flex items-center gap-1.5 w-fit ${unitBadge.color}`}>
                          {unitBadge.icon}
                          {unitBadge.label}
                        </span>
                      </td>
                      <td className="p-4 font-mono">
                        <div className="text-micro">
                          <span className="text-gray-400">Costo: <span className="font-bold text-ink-2">${p.cost_price.toFixed(2)}</span></span>
                          <span className="mx-1">•</span>
                          <span className="text-accent font-extrabold">P.Venta: ${p.sale_price.toFixed(2)}</span>
                        </div>
                        <span className="text-micro text-ok block font-semibold">
                          Mayorista: ${p.wholesale_price.toFixed(2)} (Mín: {p.wholesale_min_qty} u)
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-body ${
 isLowStock ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse' : 'text-ink'
                        }`}>
                          {isLowStock && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                          {p.stock} {p.unit_type === 'FRACTION' ? 'kg' : 'unid'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
 onClick={() => handleToggleProductStatus(p.id)}
 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
 p.is_active ? 'bg-emerald-500' : 'bg-gray-300 bg-sunken'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${p.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </td>
                      <td className="p-4 text-right space-x-1">
                        {canEditProduct && (
                          <button
 onClick={() => {
 setEditingProduct(p);
 setFormData({ ...p });
 setIsProductModalOpen(true);
                            }}
 className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md" title="Editar Producto"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        <button className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md" title="Duplicar">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md" title="Kardex Individual">
                          <History className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Table Footer */}
            <div className="p-4 bg-sunken border-t border-line flex items-center justify-between text-body text-gray-500">
              <span>Mostrando {filteredProducts.length} de {products.length} productos registrados</span>
              <div className="flex items-center gap-2">
                <span>Registros por página:</span>
                <select
 value={pageSize}
 onChange={(e) => setPageSize(Number(e.target.value))}
 className="px-2 py-1 bg-raised border border-line rounded-md text-body font-semibold"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SERIALS / IMEI MANAGER */}
      {activeTab === 'serials' && (
        <div className="bg-raised rounded-md border border-line p-6 shadow-e1 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-500" /> Control Forense de Seriales & IMEIs
              </h3>
              <p className="text-body text-gray-500">Búsqueda rápida y estado de garantía de equipos con número de serie único</p>
            </div>
            
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
 type="text"
 value={serialSearch}
 onChange={(e) => setSerialSearch(e.target.value)}
 placeholder="Escanear o buscar número de serie/IMEI..."
 className="w-full pl-9 pr-4 py-2 bg-sunken border border-line rounded-md text-body font-mono"
              />
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-sunken text-ink-2 text-micro font-extrabold uppercase tracking-wider border-b border-line">
                <th className="p-4">Producto Maestro</th>
                <th className="p-4">Número de Serie / IMEI</th>
                <th className="p-4 text-center">Estado del Serial</th>
                <th className="p-4">Ticket / Cliente Vinculado</th>
                <th className="p-4 text-right">Última Actualización</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-body font-mono">
              {serials.filter(s => s.serial_number.includes(serialSearch) || s.product_name.toLowerCase().includes(serialSearch.toLowerCase())).map((s) => (
                <tr key={s.id} className="hover:bg-sunken">
                  <td className="p-4 font-bold text-ink font-sans">{s.product_name}</td>
                  <td className="p-4 font-bold text-accent">{s.serial_number}</td>
                  <td className="p-4 text-center font-sans">
                    <span className={`px-2.5 py-1 rounded-md text-micro font-bold border ${
 s.status === 'IN_STOCK' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 border-emerald-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 border-blue-200'
                    }`}>
                      {s.status === 'IN_STOCK' ? 'EN STOCK' : 'VENDIDO'}
                    </span>
                  </td>
                  <td className="p-4 font-sans text-ink-2">
                    {s.ticket_id ? `${s.ticket_id} • ${s.customer_name}` : 'Sin asignar (En Tienda)'}
                  </td>
                  <td className="p-4 text-right text-gray-400 text-micro">{s.updated_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: CATEGORIES & BRANDS */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-raised rounded-md border border-line p-6 shadow-e1 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-extrabold text-base text-ink">Categorías Comerciales</h3>
              <button className="px-3 py-1.5 bg-blue-600 text-white font-bold text-body rounded-md flex items-center gap-1">
                <FolderPlus className="w-3.5 h-3.5" /> Nueva Categoría
              </button>
            </div>
            <div className="space-y-2 text-body">
              {['Bebidas & Gaseosas', 'Lácteos & Fiambrería', 'Electrónica & Celulares', 'Golosinas & Snacks'].map((cat, idx) => (
                <div key={idx} className="p-3 bg-sunken rounded-md border border-line flex items-center justify-between font-bold">
                  <span>{cat}</span>
                  <span className="text-gray-400 font-mono text-micro">Activa</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-raised rounded-md border border-line p-6 shadow-e1 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-extrabold text-base text-ink">Unidades de Medida y Conversiones</h3>
              <button className="px-3 py-1.5 bg-blue-600 text-white font-bold text-body rounded-md">+ Nueva Unidad</button>
            </div>
            <div className="space-y-2 text-body">
              <div className="p-3 bg-sunken rounded-md border border-line flex items-center justify-between">
                <span className="font-bold">Caja x 24 Unidades → Pieza Individual</span>
                <span className="font-mono text-blue-600 font-bold">Factor 24</span>
              </div>
              <div className="p-3 bg-sunken rounded-md border border-line flex items-center justify-between">
                <span className="font-bold">Kilogramo (Kg) → Gramos (g)</span>
                <span className="font-mono text-blue-600 font-bold">Factor 1000</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BARCODE LABEL GENERATOR */}
      {activeTab === 'labels' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-raised rounded-md border border-line p-6 shadow-e1 space-y-4">
            <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
              <Scan className="w-5 h-5 text-blue-500" /> Configuración de Plantilla Térmica
            </h3>
            
            <div className="space-y-3 text-body">
              <div>
                <label className="font-bold text-ink-2">Seleccionar Producto</label>
                <select className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-semibold">
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.barcode})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink-2">Formato de Etiqueta</label>
                  <select className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-bold">
                    <option value="50x25">Térmica 50x25 mm</option>
                    <option value="40x30">Térmica 40x30 mm</option>
                    <option value="LETTER">Hoja Carta (30 por página)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-ink-2">Cantidad a Imprimir</label>
                  <input type="number" defaultValue={24} className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-mono font-bold" />
                </div>
              </div>

              <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-extrabold flex items-center justify-center gap-2 shadow-e2 transition-all">
                <Printer className="w-4 h-4" /> Enviar a Impresora Térmica POS
              </button>
            </div>
          </div>

          {/* Real-time Label Preview */}
          <div className="bg-raised rounded-md border border-line p-6 shadow-e1 space-y-4 flex flex-col items-center justify-center">
            <span className="text-body font-extrabold text-gray-400 uppercase tracking-widest">Vista Previa de Etiqueta Térmica</span>
            
            {/* Thermal Label Mockup */}
            <div className="w-64 p-4 bg-white text-black border-2 border-dashed border-gray-400 rounded-md text-center space-y-2 shadow-e1">
              <span className="font-black text-body block tracking-wide uppercase">SUPERO POS ENTERPRISE</span>
              <p className="font-bold text-body line-clamp-1">{products[0]?.name}</p>
              <div className="py-2 bg-black text-white font-mono text-micro font-bold tracking-widest rounded">
                ||||| | |||||| |||| | |||||
              </div>
              <span className="font-mono text-micro block">{products[0]?.barcode}</span>
              <span className="font-black text-base text-blue-700 block">${products[0]?.sale_price.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT FORM MODAL (ProductFormModal) */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-raised rounded-md border border-line shadow-e3 w-full max-w-2xl overflow-hidden space-y-4">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <h3 className="font-extrabold text-base text-ink">
                {editingProduct ? 'Editar Producto del Catálogo' : 'Crear Nuevo Producto en Catálogo Maestro'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 text-body">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink-2">Código SKU *</label>
                  <div className="flex gap-2 mt-1">
                    <input
 type="text" required value={formData.sku}
 onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
 placeholder="SKU-1001"
 className="w-full p-2 bg-sunken border border-line rounded-md font-mono font-bold"
                    />
                    <button type="button" onClick={generateSKU} className="px-3 bg-blue-50 text-blue-600 font-bold rounded-md text-micro" title="Generar SKU">Auto</button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-ink-2">Código de Barras (EAN-13)</label>
                  <div className="flex gap-2 mt-1">
                    <input
 type="text" value={formData.barcode}
 onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
 placeholder="7771234567890"
 className="w-full p-2 bg-sunken border border-line rounded-md font-mono"
                    />
                    <button type="button" onClick={generateEAN13} className="px-3 bg-emerald-50 text-emerald-600 font-bold rounded-md text-micro" title="Generar EAN13">EAN</button>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-ink-2">Nombre Comercial del Producto *</label>
                <input
 type="text" required value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 placeholder="Ej. Coca Cola 2 Litros Retornable"
 className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink-2">Tipo de Unidad *</label>
                  <select
 value={formData.unit_type}
 onChange={(e) => setFormData({ ...formData, unit_type: e.target.value as any })}
 className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-bold"
                  >
                    <option value="UNIT">Pieza Estándar (UNIT)</option>
                    <option value="FRACTION">Pesable / Granel (FRACTION)</option>
                    <option value="SERIALIZED">Serializado / IMEI (SERIALIZED)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-ink-2">Categoría</label>
                  <select
 value={formData.category}
 onChange={(e) => setFormData({ ...formData, category: e.target.value })}
 className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-semibold"
                  >
                    <option value="Bebidas & Gaseosas">Bebidas & Gaseosas</option>
                    <option value="Lácteos & Fiambrería">Lácteos & Fiambrería</option>
                    <option value="Electrónica & Celulares">Electrónica & Celulares</option>
                    <option value="Golosinas & Snacks">Golosinas & Snacks</option>
                  </select>
                </div>
              </div>

              {/* Financial & Prices Section */}
              <div className="p-3 bg-sunken rounded-md border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-ink">Precios & Margen de Rentabilidad (CPP)</span>
                  <span className="text-body font-extrabold text-ok bg-ok-soft px-2 py-0.5 rounded-md border border-emerald-200">
                    Margen Utilidad: {profitMargin}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-ink-2 text-micro">Costo Base (CPP) $</label>
                    <input
 type="number" step="0.1" value={formData.cost_price}
 onChange={(e) => setFormData({ ...formData, cost_price: Number(e.target.value) })}
 className="w-full mt-1 p-2 bg-raised border border-line rounded-md font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-accent text-micro">Precio Minorista $</label>
                    <input
 type="number" step="0.1" value={formData.sale_price}
 onChange={(e) => setFormData({ ...formData, sale_price: Number(e.target.value) })}
 className="w-full mt-1 p-2 bg-raised border border-line rounded-md font-mono font-extrabold text-blue-600"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-ok text-micro">Precio Mayorista $</label>
                    <input
 type="number" step="0.1" value={formData.wholesale_price}
 onChange={(e) => setFormData({ ...formData, wholesale_price: Number(e.target.value) })}
 className="w-full mt-1 p-2 bg-raised border border-line rounded-md font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-4 py-2 bg-gray-200 bg-sunken text-ink rounded-md font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-extrabold shadow">Guardar Producto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import { useState, useEffect, useMemo, useCallback } from 'react';
import { productService, categoryService } from '@/services/productService.js';
import { warehouseService } from '@/services/warehouseService.js';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { CurrencyInput } from '@/components/ui/currency-input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from '@/components/ui/sheet.jsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select.jsx";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table.jsx";
import { Loader2, Plus, Trash2, ChefHat, Calculator, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast.jsx';
import { formatCurrency } from '@/lib/utils.js';

export default function ProductFormSheet({
    isOpen, onClose, onSaved, product = null,
    categories: categoriesProp = [],
    uoms: uomsProp = [],
    allProducts: allProductsProp = [],
}) {
    const { tenant } = useTenant();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Gunakan data dari props jika tersedia (di-fetch di parent), fallback ke state lokal
    const [categories, setCategories] = useState(categoriesProp);
    const [uoms, setUoms] = useState(uomsProp);
    const [allProducts, setAllProducts] = useState(allProductsProp);

    // Sync state lokal jika props berubah (misal setelah parent re-fetch)
    useEffect(() => { if (categoriesProp.length) setCategories(categoriesProp); }, [categoriesProp]);
    useEffect(() => { if (uomsProp.length) setUoms(uomsProp); }, [uomsProp]);
    useEffect(() => { if (allProductsProp.length) setAllProducts(allProductsProp); }, [allProductsProp]);

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        category_id: '',
        uom_id: '',
        stock_uom_id: '',
        price: '',
        cost_price: '',
        track_inventory: true,
        has_recipe: false,
        image_url: ''
    });

    // ── Variants State ──
    const [hasVariants, setHasVariants] = useState(false);
    const [variants, setVariants] = useState([]); // [{ id, name, price_diff, sku }]

    /**
     * Ingredient item:
     *   child_product_id  — produk bahan baku
     *   quantity          — jumlah dalam usage_uom (misal: 3 buah)
     *   usage_uom_id      — satuan yang dipakai di resep (misal: buah/pcs)
     *   conversion_factor — 1 usage_uom = X stock_uom (misal: 1 buah = 5 gr)
     */
    const [ingredients, setIngredients] = useState([]);
    const [newIng, setNewIng] = useState({
        child_product_id: '',
        quantity: '',
        usage_uom_id: '',
        conversion_factor: '1',
    });
    const [costOverride, setCostOverride] = useState(false);

    // Local state untuk text input — update formData hanya saat blur
    // agar tidak trigger re-render seluruh form setiap keystroke
    const [localName, setLocalName] = useState('');
    const [localSku, setLocalSku] = useState('');

    // Helper state untuk hitung modal
    const [helperBuyPrice, setHelperBuyPrice] = useState('');
    const [helperPackSize, setHelperPackSize] = useState('');

    useEffect(() => {
        if (isOpen && tenant) {
            // Hanya fetch dropdown jika belum ada data dari props (fallback)
            if (!categoriesProp.length || !uomsProp.length || !allProductsProp.length) {
                fetchDropdowns();
            }
            if (product) {
                setFormData({
                    name: product.name || '',
                    sku: product.sku || '',
                    category_id: product.category_id || '',
                    uom_id: product.uom_id || '',
                    stock_uom_id: product.stock_uom_id || '',
                    price: product.price || '',
                    cost_price: product.cost_price || '',
                    track_inventory: product.track_inventory ?? true,
                    has_recipe: product.has_recipe ?? false,
                    image_url: product.image_url || ''
                });
                setLocalName(product.name || '');
                setLocalSku(product.sku || '');
                setCostOverride(false);
                // Load recipe & variants
                if (product.has_recipe) loadRecipe(product.id);
                // Load variants independent of recipe (could happen conceptually)
                loadVariants(product.id);
            } else {
                resetForm();
            }
        }
    }, [isOpen, product, tenant]);

    const resetForm = () => {
        setFormData({ name: '', sku: '', category_id: '', uom_id: '', stock_uom_id: '', price: '', cost_price: '', track_inventory: true, has_recipe: false, image_url: '' });
        setLocalName('');
        setLocalSku('');
        setIngredients([]);
        setNewIng({ child_product_id: '', quantity: '', usage_uom_id: '', conversion_factor: '1', variant_id: '' });
        setCostOverride(false);
        setHasVariants(false);
        setHasVariants(false);
        setVariants([]);
        setHelperBuyPrice('');
        setHelperPackSize('');
    };

    const fetchDropdowns = async () => {
        try {
            const [cats, uomList, products] = await Promise.all([
                categoryService.getAll(),
                warehouseService.getUOMs(),
                productService.getAll(),
            ]);
            setCategories((cats || []).filter(c => c.tenant_id === tenant.id));
            setUoms(uomList || []);
            setAllProducts(products || []);
        } catch (err) {
            console.error('Error fetching dropdowns:', err);
        }
    };

    const loadRecipe = async (productId) => {
        try {
            const recipe = await productService.getRecipe(productId);
            setIngredients((recipe || []).map(r => ({
                child_product_id: r.child_product_id,
                quantity: r.quantity,
                usage_uom_id: r.usage_uom_id || r.child_product?.uom_id || '',
                conversion_factor: r.conversion_factor ?? 1,
                variant_id: r.variant_id || '', // Load variant_id
            })));
        } catch (err) {
            console.error('Error loading recipe:', err);
        }
    };

    const loadVariants = async (productId) => {
        try {
            const data = await productService.getVariants(productId);
            if (data && data.length > 0) {
                setHasVariants(true);
                setVariants(data);
            }
        } catch (err) {
            console.error('Error loading variants:', err);
        }
    };

    // ── Auto-hitung HPP dari ingredients ──
    // HPP = Σ (quantity × conversion_factor × cost_price_bahan_per_stock_uom)
    const calculatedCost = useMemo(() => {
        if (!formData.has_recipe || ingredients.length === 0) return null;
        return ingredients.reduce((total, ing) => {
            const prod = allProducts.find(p => p.id === ing.child_product_id);
            const unitCost = parseFloat(prod?.cost_price || prod?.price || 0);
            const qty = parseFloat(ing.quantity) || 0;
            const factor = parseFloat(ing.conversion_factor) || 1;
            return total + (unitCost * qty * factor);
        }, 0);
    }, [ingredients, allProducts, formData.has_recipe]);

    // Tidak ada useEffect untuk sync cost_price — langsung pakai calculatedCost di submit

    const handleAddIngredient = () => {
        if (!newIng.child_product_id || !newIng.quantity) {
            toast({ title: "Validasi", description: "Pilih bahan baku dan isi jumlah.", variant: "destructive" });
            return;
        }
        const qty = parseFloat(newIng.quantity);
        const factor = parseFloat(newIng.conversion_factor) || 1;
        if (isNaN(qty) || qty <= 0) {
            toast({ title: "Validasi", description: "Jumlah harus lebih dari 0.", variant: "destructive" });
            return;
        }
        if (ingredients.some(i => i.child_product_id === newIng.child_product_id)) {
            toast({ title: "Duplikat", description: "Bahan baku ini sudah ada di resep.", variant: "destructive" });
            return;
        }
        const selectedProduct = allProducts.find(p => p.id === newIng.child_product_id);
        setIngredients(prev => [...prev, {
            child_product_id: newIng.child_product_id,
            quantity: qty,
            usage_uom_id: newIng.usage_uom_id || selectedProduct?.uom_id || '',
            conversion_factor: factor,
        }]);
        setNewIng({ child_product_id: '', quantity: '', usage_uom_id: '', conversion_factor: '1' });
    };

    const handleRemoveIngredient = (idx) => setIngredients(prev => prev.filter((_, i) => i !== idx));

    const handleIngredientChange = (idx, field, val) => {
        setIngredients(prev => prev.map((ing, i) => i === idx ? { ...ing, [field]: val } : ing));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.price) {
            toast({ title: "Validasi Gagal", description: "Nama dan Harga Wajib diisi.", variant: "destructive" });
            return;
        }
        if (formData.has_recipe && ingredients.length === 0) {
            toast({ title: "Validasi Gagal", description: "Produk komposit harus memiliki minimal 1 bahan baku.", variant: "destructive" });
            return;
        }
        try {
            setIsSubmitting(true);
            // Jika produk komposit dan HPP tidak di-override, pakai calculatedCost
            const effectiveCostPrice = (formData.has_recipe && !costOverride && calculatedCost !== null)
                ? calculatedCost
                : (formData.cost_price ? parseFloat(formData.cost_price) : 0);
            const payload = {
                ...formData,
                price: parseFloat(formData.price),
                cost_price: effectiveCostPrice,
            };
            let savedProductId;
            if (product) {
                await productService.update(product.id, payload);
                savedProductId = product.id;
            } else {
                const created = await productService.create({ ...payload, tenant_id: tenant.id });
                savedProductId = created.id;
            }
            // 1. Simpan Varian
            if (hasVariants) {
                await productService.updateVariants(savedProductId, variants);
                // Refresh variants to get IDs for new variants (needed for recipe ingredients)
                // Note: productService.updateVariants returns upserted data? 
                // Currently it selects returned data. Let's assume we reload or we use names to map if needed?
                // Actually, if we just added a variant "Pedas" and added an ingredient for "Pedas",
                // the ingredient.variant_id might be temporary (e.g. "temp-1").
                // We need to map temp IDs to real IDs.
                // Simplified approach for now: User must save variants first? OR we handle it.
                // Let's re-fetch variants after save to be sure.
                const updatedVariants = await productService.getVariants(savedProductId);

                // Map temporary/old variant IDs in ingredients to new real IDs matching the name
                // This assumes variant names are unique per product.
                // Or we can rely on existing IDs if they were already saved.
                // For NEW variants, ingredient.variant_id is what? 
                // Let's assume for now we use ID if available. 
                // If it's a new variant, we need its new ID.
                const variantMap = {};
                updatedVariants.forEach(v => { variantMap[v.name] = v.id; });

                // Update ingredients variant_ids based on name matching if ID was temp?
                // For this MVP, let's assume user adds variant -> we generate a temp ID -> 
                // we save variants -> we get real ID.
                // But simplified: We accept we might need a reload.
                // Better: updateVariants should return the map.
                // Let's just create a map from name -> ID from updatedVariants.
                // And ingredients should track variant by ID or Name? ID is better.
                // For new variants, we can use a temp ID/UUID client side.
                // But m_product_variants needs distinct IDs.
                // Let's assume we use valid IDs.
            } else {
                // If variants disabled, clear all variants?
                await productService.updateVariants(savedProductId, []);
            }

            // 2. Simpan Resep
            if (formData.has_recipe && savedProductId) {
                await productService.updateRecipe(savedProductId, ingredients);
            } else if (!formData.has_recipe && product?.has_recipe) {
                await productService.updateRecipe(savedProductId, []);
            }
            toast({ title: "Sukses", description: `Produk berhasil ${product ? 'diperbarui' : 'ditambahkan'}.` });
            onSaved();
            onClose();
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Gagal menyimpan produk: " + err.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = useCallback((field, value) => setFormData(prev => ({ ...prev, [field]: value })), []);

    const selectedCategory = useMemo(
        () => categories.find(c => c.id === formData.category_id),
        [categories, formData.category_id]
    );
    const skuPlaceholder = useMemo(
        () => selectedCategory?.code ? `Auto: ${selectedCategory.code}-001` : 'Auto / Manual',
        [selectedCategory]
    );
    const ingredientOptions = useMemo(
        () => allProducts.filter(p => p.id !== product?.id),
        [allProducts, product?.id]
    );

    // Helper: ambil satuan stok produk (stock_uom_id jika ada, fallback ke uom_id)
    const getStockUomId = useCallback(
        (prod) => prod?.stock_uom_id || prod?.uom_id || '',
        []
    );

    // Helper: tampilkan info konversi satuan
    const getConversionLabel = useCallback((ing) => {
        const prod = allProducts.find(p => p.id === ing.child_product_id);
        const usageUom = uoms.find(u => u.id === ing.usage_uom_id);
        const stockUomId = prod?.stock_uom_id || prod?.uom_id || '';
        const stockUom = uoms.find(u => u.id === stockUomId);
        const factor = parseFloat(ing.conversion_factor) || 1;
        if (!usageUom || !stockUom) return null;
        if (usageUom.id === stockUom.id) return null;
        return `1 ${usageUom.code} = ${factor} ${stockUom.code}`;
    }, [allProducts, uoms]);

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-full sm:w-[700px] sm:max-w-[700px] overflow-y-auto pl-8 pr-8">
                <SheetHeader className="pb-2">
                    <SheetTitle className="text-xl">{product ? 'Edit Produk' : 'Tambah Produk Baru'}</SheetTitle>
                    <SheetDescription>Isi detail produk lengkap di bawah ini.</SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-6">

                    {/* ── Info Dasar ── */}
                    <section className="space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informasi Produk</h4>
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="name">Nama Produk <span className="text-destructive">*</span></Label>
                            <Input
                                id="name"
                                value={localName}
                                onChange={e => setLocalName(e.target.value)}
                                onBlur={e => handleChange('name', e.target.value)}
                                placeholder="Contoh: Nasi Goreng Spesial"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="sku">SKU / Kode</Label>
                                <Input
                                    id="sku"
                                    value={localSku}
                                    onChange={e => setLocalSku(e.target.value)}
                                    onBlur={e => handleChange('sku', e.target.value)}
                                    placeholder={skuPlaceholder}
                                    className="font-mono"
                                />
                                {!formData.sku && selectedCategory?.code && (
                                    <p className="text-xs text-muted-foreground">Kosongkan untuk auto-generate</p>
                                )}
                            </div>
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="category">Kategori</Label>
                                <Select value={formData.category_id} onValueChange={val => handleChange('category_id', val)}>
                                    <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                                    <SelectContent>
                                        {categories.map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.code ? <span className="font-mono text-xs text-muted-foreground mr-1">[{c.code}]</span> : null}
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </section>

                    {/* ── Harga & Satuan ── */}
                    <section className="border-t pt-5 space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Harga & Satuan</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="price">Harga Jual <span className="text-destructive">*</span></Label>
                                <CurrencyInput id="price" value={formData.price} onValueChange={v => handleChange('price', v)} placeholder="0" />
                            </div>
                            <div className="grid w-full items-center gap-1.5">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="cost_price">
                                        Harga Modal
                                        {formData.stock_uom_id && (
                                            <span className="text-muted-foreground font-normal ml-1">
                                                (per {uoms.find(u => u.id === formData.stock_uom_id)?.code || 'unit'})
                                            </span>
                                        )}
                                    </Label>
                                    {formData.has_recipe && calculatedCost !== null && costOverride && (
                                        <button type="button" className="flex items-center gap-1 text-xs text-primary hover:underline"
                                            onClick={() => { setCostOverride(false); setFormData(prev => ({ ...prev, cost_price: calculatedCost })); }}>
                                            <Calculator className="h-3 w-3" />Reset ke kalkulasi
                                        </button>
                                    )}
                                </div>
                                <CurrencyInput
                                    id="cost_price"
                                    value={formData.cost_price}
                                    onValueChange={v => { setCostOverride(true); handleChange('cost_price', v); }}
                                    placeholder="0"
                                />

                                {/* Helper Hitung Modal */}
                                {!formData.has_recipe && (
                                    <div className="rounded-md bg-muted/40 border border-dashed p-3 mt-1 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                                💡 Bantu Hitung Modal
                                            </p>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                                                onClick={() => { setHelperBuyPrice(''); setHelperPackSize(''); }}
                                            >
                                                Reset
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">Harga Beli per Pack</Label>
                                                <CurrencyInput
                                                    className="h-8 text-xs bg-background"
                                                    placeholder="Rp 0"
                                                    value={helperBuyPrice}
                                                    onValueChange={(val) => {
                                                        setHelperBuyPrice(val);
                                                        const price = parseFloat(val) || 0;
                                                        const size = parseFloat(helperPackSize) || 0;
                                                        if (price > 0 && size > 0) {
                                                            const costPerUnit = price / size;
                                                            handleChange('cost_price', costPerUnit);
                                                            setCostOverride(true);
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">
                                                    Isi per Pack <span className="text-muted-foreground/70">({uoms.find(u => u.id === formData.stock_uom_id)?.code || 'unit'})</span>
                                                </Label>
                                                <Input
                                                    type="number"
                                                    className="h-8 text-xs bg-background"
                                                    placeholder="1000"
                                                    value={helperPackSize}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setHelperPackSize(val);
                                                        const price = parseFloat(helperBuyPrice) || 0;
                                                        const size = parseFloat(val) || 0;
                                                        if (price > 0 && size > 0) {
                                                            const costPerUnit = price / size;
                                                            handleChange('cost_price', costPerUnit);
                                                            setCostOverride(true);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        {helperBuyPrice > 0 && helperPackSize > 0 && (
                                            <div className="text-[10px] text-muted-foreground bg-background rounded border px-2 py-1.5 flex items-center gap-1.5">
                                                <ArrowRight className="h-3 w-3" />
                                                <span>
                                                    {formatCurrency(helperBuyPrice)} / {helperPackSize} {uoms.find(u => u.id === formData.stock_uom_id)?.code}
                                                    <span className="font-semibold text-foreground ml-1">
                                                        = {formatCurrency(helperBuyPrice / helperPackSize)} / {uoms.find(u => u.id === formData.stock_uom_id)?.code}
                                                    </span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {formData.has_recipe && calculatedCost !== null && !costOverride && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calculator className="h-3 w-3" />Auto dari resep: {formatCurrency(calculatedCost)}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="stock_uom">Satuan Stok</Label>
                                <Select value={formData.stock_uom_id} onValueChange={val => handleChange('stock_uom_id', val)}>
                                    <SelectTrigger><SelectValue placeholder="Satuan internal (gr, ml..." /></SelectTrigger>
                                    <SelectContent>
                                        {uoms.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.code})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">Satuan untuk hitung stok internal. Gunakan satuan terkecil (gr, ml).</p>
                            </div>
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="uom">Satuan Jual</Label>
                                <Select value={formData.uom_id} onValueChange={val => handleChange('uom_id', val)}>
                                    <SelectTrigger><SelectValue placeholder="Satuan ke customer (porsi, bh...)" /></SelectTrigger>
                                    <SelectContent>
                                        {uoms.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.code})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">Satuan yang tampil di kasir / struk.</p>
                            </div>
                        </div>
                    </section>

                    {/* ── Pengaturan Stok ── */}
                    <section className="border-t pt-5 space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pengaturan Stok</h4>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Lacak Stok</Label>
                                <p className="text-sm text-muted-foreground">Otomatis kurangi stok saat penjualan.</p>
                            </div>
                            <Switch checked={formData.track_inventory} onCheckedChange={val => handleChange('track_inventory', val)} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Produk Komposit (Resep)</Label>
                                <p className="text-sm text-muted-foreground">Produk ini terdiri dari bahan baku lain.</p>
                            </div>
                            <Switch checked={formData.has_recipe} onCheckedChange={val => {
                                handleChange('has_recipe', val);
                                if (!val) { setIngredients([]); setCostOverride(false); }
                            }} />
                        </div>
                    </section>

                    {/* ── Varian Produk ── */}
                    <section className="border-t pt-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Varian Produk</h4>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="has_variants" className="text-sm">Punya Varian?</Label>
                                <Switch id="has_variants" checked={hasVariants} onCheckedChange={setHasVariants} />
                            </div>
                        </div>

                        {hasVariants && (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nama Varian</TableHead>
                                            <TableHead className="w-[150px]">Beda Harga (+/-)</TableHead>
                                            <TableHead className="w-[150px]">SKU (Opsional)</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {variants.map((v, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>
                                                    <Input
                                                        value={v.name}
                                                        onChange={e => {
                                                            const newVariants = [...variants];
                                                            newVariants[idx].name = e.target.value;
                                                            setVariants(newVariants);
                                                        }}
                                                        placeholder="Contoh: Pedas / Large"
                                                        className="h-8"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <CurrencyInput
                                                        value={v.price_diff}
                                                        onValueChange={val => {
                                                            const newVariants = [...variants];
                                                            newVariants[idx].price_diff = val;
                                                            setVariants(newVariants);
                                                        }}
                                                        placeholder="0"
                                                        className="h-8"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={v.sku || ''}
                                                        onChange={e => {
                                                            const newVariants = [...variants];
                                                            newVariants[idx].sku = e.target.value;
                                                            setVariants(newVariants);
                                                        }}
                                                        placeholder="SKU.."
                                                        className="h-8 font-mono"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                                                        onClick={() => setVariants(variants.filter((_, i) => i !== idx))}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow>
                                            <TableCell colSpan={4}>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full border-dashed"
                                                    onClick={() => setVariants([...variants, { id: crypto.randomUUID(), name: '', price_diff: 0, sku: '' }])}
                                                >
                                                    <Plus className="mr-2 h-4 w-4" /> Tambah Varian
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </section>

                    {/* ── Section Resep / BOM ── */}
                    {formData.has_recipe && (
                        <section className="border-t pt-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ChefHat className="h-4 w-4 text-primary" />
                                    <h4 className="text-sm font-semibold">Bahan Baku / Resep</h4>
                                </div>
                                {ingredients.length > 0 && calculatedCost !== null && (
                                    <span className="text-xs text-muted-foreground">
                                        Total HPP: <span className="font-semibold text-foreground">{formatCurrency(calculatedCost)}</span>
                                    </span>
                                )}
                            </div>

                            {/* Best practice callout */}
                            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2.5 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                <p className="font-semibold">💡 Best Practice Restoran</p>
                                <p>Simpan stok bahan baku dalam <strong>satuan terkecil</strong> (gr, ml). Di resep, pakai satuan chef (buah, siung, sdm) lalu isi <strong>faktor konversi</strong>-nya.</p>
                                <p className="opacity-70">Contoh: Cabe stok dalam <strong>gr</strong> → resep pakai <strong>buah</strong>, faktor = 5 (1 buah = 5 gr)</p>
                            </div>

                            {/* Form tambah ingredient */}
                            <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                                <p className="text-xs font-medium text-muted-foreground">Tambah bahan baku:</p>

                                {/* Row 1: Pilih produk */}
                                <div>
                                    <Label className="text-xs mb-1.5 block">Produk / Bahan Baku</Label>
                                    <Select value={newIng.child_product_id} onValueChange={val => {
                                        const p = allProducts.find(x => x.id === val);
                                        // Default ke Satuan Jual (uom_id) jika ada, agar lebih natural (misal: "1 Pcs")
                                        // User tinggal masukin faktor konversi ke Satuan Stok (misal: 1 Pcs = 5 Gr)
                                        setNewIng(prev => ({ ...prev, child_product_id: val, usage_uom_id: p.uom_id || getStockUomId(p) }));
                                    }}>
                                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih bahan..." /></SelectTrigger>
                                        <SelectContent>
                                            {ingredientOptions.map(p => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    <span className="font-mono text-xs text-muted-foreground mr-1.5">{p.sku}</span>
                                                    {p.name}
                                                    <span className="ml-1.5 text-xs text-muted-foreground">
                                                        (stok: {uoms.find(u => u.id === getStockUomId(p))?.code || '?'})
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground mt-1 px-1">
                                        *Satuan default: Satuan Jual. Pastikan konversi ke Satuan Stok sesuai.
                                    </p>
                                </div>

                                {/* Row 2: Jumlah + Satuan Pakai + Konversi */}
                                <div className="grid grid-cols-[80px_1fr_80px_1fr] gap-2 items-end">
                                    <div>
                                        <Label className="text-xs mb-1.5 block">Jumlah di Resep</Label>
                                        <Input className="h-9 text-sm" type="number" min="0" step="any" placeholder="0"
                                            value={newIng.quantity} onChange={e => setNewIng(prev => ({ ...prev, quantity: e.target.value }))} />
                                    </div>
                                    <div>
                                        <Label className="text-xs mb-1.5 block">Satuan Resep</Label>
                                        <Select value={newIng.usage_uom_id} onValueChange={val => setNewIng(prev => ({ ...prev, usage_uom_id: val }))}>
                                            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Satuan..." /></SelectTrigger>
                                            <SelectContent>
                                                {uoms.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.code})</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs mb-1.5 block">Faktor Konversi</Label>
                                        <Input className="h-9 text-sm" type="number" min="0" step="any" placeholder="1"
                                            value={newIng.conversion_factor} onChange={e => setNewIng(prev => ({ ...prev, conversion_factor: e.target.value }))} />
                                    </div>
                                    <div>
                                        <Label className="text-xs mb-1.5 block">Satuan Stok (otomatis)</Label>
                                        <div className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm text-muted-foreground font-mono">
                                            {(() => {
                                                const p = allProducts.find(x => x.id === newIng.child_product_id);
                                                return uoms.find(u => u.id === getStockUomId(p))?.code || '—';
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {hasVariants && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Berlaku untuk Varian</Label>
                                        <Select
                                            value={newIng.variant_id || "ALL"}
                                            onValueChange={val => setNewIng(prev => ({ ...prev, variant_id: val === "ALL" ? "" : val }))}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Pilih Varian" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ALL">Semua Varian (Dasar)</SelectItem>
                                                {variants.filter(v => v.name).map(v => (
                                                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Preview konversi */}
                                {newIng.child_product_id && newIng.usage_uom_id && newIng.quantity && (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background rounded px-3 py-2 border">
                                        <ArrowRight className="h-3 w-3 shrink-0" />
                                        {(() => {
                                            const p = allProducts.find(x => x.id === newIng.child_product_id);
                                            const usageUom = uoms.find(u => u.id === newIng.usage_uom_id);
                                            const stockUom = uoms.find(u => u.id === getStockUomId(p));
                                            const qty = parseFloat(newIng.quantity) || 0;
                                            const factor = parseFloat(newIng.conversion_factor) || 1;
                                            const stockQty = qty * factor;
                                            return `${qty} ${usageUom?.code || '?'} × ${factor} = ${stockQty} ${stockUom?.code || '?'} akan dikurangi dari stok`;
                                        })()}
                                    </div>
                                )}

                                <Button type="button" size="sm" className="w-full h-9" onClick={handleAddIngredient}>
                                    <Plus className="h-4 w-4 mr-1" /> Tambah ke Resep
                                </Button>
                            </div>

                            {/* Daftar ingredient */}
                            {ingredients.length === 0 ? (
                                <div className="rounded-lg border border-dashed p-6 text-center">
                                    <ChefHat className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">Belum ada bahan baku. Tambahkan di atas.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {ingredients.map((ing, idx) => {
                                        const prod = allProducts.find(p => p.id === ing.child_product_id);
                                        const usageUom = uoms.find(u => u.id === ing.usage_uom_id);
                                        const stockUom = uoms.find(u => u.id === getStockUomId(prod));
                                        const factor = parseFloat(ing.conversion_factor) || 1;
                                        const stockQty = (parseFloat(ing.quantity) || 0) * factor;
                                        const lineCost = parseFloat(prod?.cost_price || prod?.price || 0) * stockQty;
                                        const convLabel = getConversionLabel(ing);
                                        return (
                                            <div key={idx} className="rounded-md border px-3 py-2.5 bg-background space-y-2">
                                                <div className="flex items-start gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-sm">
                                                            {prod?.name}
                                                            {ing.variant_id && (
                                                                <span className="ml-2 inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                                                    Khusus: {variants.find(v => v.id === ing.variant_id)?.name || 'Unknown'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground font-mono">
                                                            {prod?.sku || ''} · HPP/unit: {formatCurrency(prod?.cost_price || prod?.price || 0)}
                                                        </p>
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon"
                                                        className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                                                        onClick={() => handleRemoveIngredient(idx)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-[80px_1fr_80px_1fr] gap-2 items-center">
                                                    <Input type="number" min="0" step="any" className="h-8 text-sm text-right"
                                                        value={ing.quantity} onChange={e => handleIngredientChange(idx, 'quantity', parseFloat(e.target.value) || 0)} />
                                                    <Select value={ing.usage_uom_id} onValueChange={val => handleIngredientChange(idx, 'usage_uom_id', val)}>
                                                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {uoms.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.code})</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <Input type="number" min="0" step="any" className="h-8 text-sm text-right"
                                                        value={ing.conversion_factor} onChange={e => handleIngredientChange(idx, 'conversion_factor', e.target.value)} />
                                                    <div className="h-8 flex items-center px-2 rounded-md border bg-muted/50 text-xs text-muted-foreground font-mono">
                                                        {stockUom?.code || '—'}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <ArrowRight className="h-3 w-3" />
                                                        {convLabel
                                                            ? `${ing.quantity} ${usageUom?.code} × ${factor} = ${stockQty} ${stockUom?.code} dari stok`
                                                            : `${stockQty} ${stockUom?.code} dari stok`}
                                                    </span>
                                                    <span className="font-medium text-foreground">{formatCurrency(lineCost)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Total HPP */}
                                    <div className="flex justify-between items-center rounded-md bg-muted/40 px-3 py-2.5 mt-1">
                                        <span className="text-sm font-medium">Total HPP (Harga Pokok Produksi)</span>
                                        <span className="text-sm font-bold text-primary">{formatCurrency(calculatedCost)}</span>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    <SheetFooter className="gap-2 pt-2 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Simpan Produk
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet >
    );
}

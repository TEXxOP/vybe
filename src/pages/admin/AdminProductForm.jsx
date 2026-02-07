import { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import './AdminProductForm.css';

const CATEGORIES = ['jackets', 'shirts', 'pants', 'caps', 'accessories', 'shoes', 'hoodies'];
const COLLECTIONS = ['edge', 'canvas', 'energy', 'limited', 'classics'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const BADGES = ['new', 'bestseller', 'limited', 'sale', 'soldout'];

const AdminProductForm = ({ product, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        comparePrice: '',
        category: 'shirts',
        collection: 'classics',
        images: [{ url: '', alt: '' }],
        sizes: [{ size: 'M', stock: 10 }],
        colors: [{ name: '', hexCode: '#000000' }],
        tags: '',
        badge: '',
        isFeatured: false,
        isLimited: false,
        limitedStock: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                description: product.description || '',
                price: product.price || '',
                comparePrice: product.comparePrice || '',
                category: product.category || 'shirts',
                collection: product.collection || 'classics',
                images: product.images?.length ? product.images : [{ url: '', alt: '' }],
                sizes: product.sizes?.length ? product.sizes : [{ size: 'M', stock: 10 }],
                colors: product.colors?.length ? product.colors : [{ name: '', hexCode: '#000000' }],
                tags: product.tags?.join(', ') || '',
                badge: product.badge || '',
                isFeatured: product.isFeatured || false,
                isLimited: product.isLimited || false,
                limitedStock: product.limitedStock || ''
            });
        }
    }, [product]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Size handlers
    const addSize = () => {
        setFormData(prev => ({
            ...prev,
            sizes: [...prev.sizes, { size: 'M', stock: 0 }]
        }));
    };

    const updateSize = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            sizes: prev.sizes.map((s, i) =>
                i === index ? { ...s, [field]: field === 'stock' ? parseInt(value) || 0 : value } : s
            )
        }));
    };

    const removeSize = (index) => {
        if (formData.sizes.length > 1) {
            setFormData(prev => ({
                ...prev,
                sizes: prev.sizes.filter((_, i) => i !== index)
            }));
        }
    };

    // Color handlers
    const addColor = () => {
        setFormData(prev => ({
            ...prev,
            colors: [...prev.colors, { name: '', hexCode: '#000000' }]
        }));
    };

    const updateColor = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            colors: prev.colors.map((c, i) =>
                i === index ? { ...c, [field]: value } : c
            )
        }));
    };

    const removeColor = (index) => {
        if (formData.colors.length > 1) {
            setFormData(prev => ({
                ...prev,
                colors: prev.colors.filter((_, i) => i !== index)
            }));
        }
    };

    // Image handlers
    const updateImage = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.map((img, i) =>
                i === index ? { ...img, [field]: value } : img
            )
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const productData = {
            ...formData,
            price: parseFloat(formData.price),
            comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : undefined,
            limitedStock: formData.limitedStock ? parseInt(formData.limitedStock) : undefined,
            tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
            badge: formData.badge || null,
            images: formData.images.filter(img => img.url),
            colors: formData.colors.filter(c => c.name)
        };

        try {
            await onSave(productData);
        } catch (error) {
            alert('Failed to save product: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{product ? 'Edit Product' : 'Add New Product'}</h2>
                    <button className="close-btn" onClick={onClose}>
                        <Icons.X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="product-form">
                    {/* Basic Info */}
                    <div className="form-section">
                        <h3>Basic Information</h3>
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label>Product Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g., Urban Vanguard Tee"
                                />
                            </div>
                            <div className="form-group full-width">
                                <label>Description *</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    required
                                    rows={3}
                                    placeholder="Describe the product..."
                                />
                            </div>
                            <div className="form-group">
                                <label>Price (₹) *</label>
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleChange}
                                    required
                                    min="0"
                                    placeholder="2999"
                                />
                            </div>
                            <div className="form-group">
                                <label>Compare Price (₹)</label>
                                <input
                                    type="number"
                                    name="comparePrice"
                                    value={formData.comparePrice}
                                    onChange={handleChange}
                                    min="0"
                                    placeholder="3999"
                                />
                            </div>
                            <div className="form-group">
                                <label>Category *</label>
                                <select name="category" value={formData.category} onChange={handleChange}>
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Collection</label>
                                <select name="collection" value={formData.collection} onChange={handleChange}>
                                    {COLLECTIONS.map(col => (
                                        <option key={col} value={col}>{col.charAt(0).toUpperCase() + col.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Sizes */}
                    <div className="form-section">
                        <div className="section-header">
                            <h3>Sizes & Stock</h3>
                            <button type="button" className="add-btn-small" onClick={addSize}>
                                <Icons.Plus size={16} /> Add Size
                            </button>
                        </div>
                        <div className="dynamic-list">
                            {formData.sizes.map((size, index) => (
                                <div key={index} className="dynamic-item">
                                    <select
                                        value={size.size}
                                        onChange={(e) => updateSize(index, 'size', e.target.value)}
                                    >
                                        {SIZES.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        value={size.stock}
                                        onChange={(e) => updateSize(index, 'stock', e.target.value)}
                                        placeholder="Stock"
                                        min="0"
                                    />
                                    {formData.sizes.length > 1 && (
                                        <button type="button" className="remove-btn" onClick={() => removeSize(index)}>
                                            <Icons.Trash size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Colors */}
                    <div className="form-section">
                        <div className="section-header">
                            <h3>Colors</h3>
                            <button type="button" className="add-btn-small" onClick={addColor}>
                                <Icons.Plus size={16} /> Add Color
                            </button>
                        </div>
                        <div className="dynamic-list">
                            {formData.colors.map((color, index) => (
                                <div key={index} className="dynamic-item color-item">
                                    <input
                                        type="color"
                                        value={color.hexCode}
                                        onChange={(e) => updateColor(index, 'hexCode', e.target.value)}
                                        className="color-picker"
                                    />
                                    <input
                                        type="text"
                                        value={color.name}
                                        onChange={(e) => updateColor(index, 'name', e.target.value)}
                                        placeholder="Color name (e.g., Black)"
                                    />
                                    {formData.colors.length > 1 && (
                                        <button type="button" className="remove-btn" onClick={() => removeColor(index)}>
                                            <Icons.Trash size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Image */}
                    <div className="form-section">
                        <h3>Product Image</h3>
                        <div className="form-group full-width">
                            <label>Image URL *</label>
                            <input
                                type="url"
                                value={formData.images[0]?.url || ''}
                                onChange={(e) => updateImage(0, 'url', e.target.value)}
                                placeholder="https://images.unsplash.com/..."
                                required
                            />
                        </div>
                        {formData.images[0]?.url && (
                            <div className="image-preview">
                                <img src={formData.images[0].url} alt="Preview" />
                            </div>
                        )}
                    </div>

                    {/* Extra Options */}
                    <div className="form-section">
                        <h3>Additional Options</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Badge</label>
                                <select name="badge" value={formData.badge} onChange={handleChange}>
                                    <option value="">None</option>
                                    {BADGES.map(b => (
                                        <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Tags (comma separated)</label>
                                <input
                                    type="text"
                                    name="tags"
                                    value={formData.tags}
                                    onChange={handleChange}
                                    placeholder="streetwear, premium, casual"
                                />
                            </div>
                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="isFeatured"
                                        checked={formData.isFeatured}
                                        onChange={handleChange}
                                    />
                                    Featured Product
                                </label>
                            </div>
                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="isLimited"
                                        checked={formData.isLimited}
                                        onChange={handleChange}
                                    />
                                    Limited Edition
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="form-actions">
                        <button type="button" className="cancel-btn" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="save-btn" disabled={saving}>
                            {saving ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminProductForm;

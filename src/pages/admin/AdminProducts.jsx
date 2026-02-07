import { useState, useEffect } from 'react';
import { adminAPI, productsAPI } from '../../services/api';
import { Icons } from '../../components/Icons';
import AdminProductForm from './AdminProductForm';
import './AdminTable.css';

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const data = await productsAPI.getAll({ limit: 1000 });
            setProducts(data.products || []);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingProduct(null);
        setShowForm(true);
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setShowForm(true);
    };

    const handleSave = async (productData) => {
        if (editingProduct) {
            await adminAPI.updateProduct(editingProduct._id, productData);
            setProducts(products.map(p =>
                p._id === editingProduct._id ? { ...p, ...productData } : p
            ));
        } else {
            const data = await adminAPI.createProduct(productData);
            if (data.product) {
                setProducts([data.product, ...products]);
            } else {
                fetchProducts(); // Refresh list
            }
        }
        setShowForm(false);
        setEditingProduct(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await adminAPI.deleteProduct(id);
                setProducts(products.filter(p => p._id !== id));
            } catch (error) {
                alert('Failed to delete product');
            }
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(price);
    };

    if (loading) return <div className="admin-loading">Loading products...</div>;

    return (
        <div className="admin-page">
            <div className="page-header-actions">
                <button className="add-btn" onClick={handleAdd}>
                    <Icons.Plus size={20} />
                    Add Product
                </button>
            </div>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Colors</th>
                            <th>Stock</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(product => (
                            <tr key={product._id}>
                                <td>
                                    <img
                                        src={product.images?.[0]?.url || product.image || 'https://via.placeholder.com/50'}
                                        alt={product.name}
                                        className="table-img"
                                    />
                                </td>
                                <td className="font-medium">{product.name}</td>
                                <td className="capitalize">{product.category}</td>
                                <td>{formatPrice(product.price)}</td>
                                <td>
                                    <div className="color-dots">
                                        {product.colors?.slice(0, 4).map((color, i) => (
                                            <span
                                                key={i}
                                                className="color-dot"
                                                style={{ backgroundColor: color.hexCode }}
                                                title={color.name}
                                            />
                                        ))}
                                        {product.colors?.length > 4 && (
                                            <span className="color-more">+{product.colors.length - 4}</span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <span className={`stock-badge ${product.sizes?.some(s => s.stock > 0) ? 'instock' : 'outstock'}`}>
                                        {product.sizes?.reduce((acc, s) => acc + s.stock, 0) || 0} units
                                    </span>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button className="icon-btn edit" onClick={() => handleEdit(product)}>
                                            <Icons.Edit size={18} />
                                        </button>
                                        <button className="icon-btn delete" onClick={() => handleDelete(product._id)}>
                                            <Icons.Trash size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <AdminProductForm
                    product={editingProduct}
                    onSave={handleSave}
                    onClose={() => {
                        setShowForm(false);
                        setEditingProduct(null);
                    }}
                />
            )}
        </div>
    );
};

export default AdminProducts;

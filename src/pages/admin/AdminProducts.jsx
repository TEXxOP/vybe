import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Icons } from '../../components/Icons';
import './AdminTable.css'; // Reused styles

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const data = await adminAPI.getStats(); // Gets products inside stats for now, or use direct API
            setProducts(data.products || []);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
        }
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
                <button className="add-btn">
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
                                    <span className={`stock-badge ${product.sizes?.some(s => s.stock > 0) ? 'instock' : 'outstock'}`}>
                                        {product.sizes?.reduce((acc, s) => acc + s.stock, 0) || 0} units
                                    </span>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button className="icon-btn edit">
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
        </div>
    );
};

export default AdminProducts;

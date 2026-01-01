// import React, { useState, useEffect } from 'react';
// import { apiRequest } from '../utils/api';

// const PartyBalanceEditor = ({ onUpdate }) => {
//   const [parties, setParties] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [isAdding, setIsAdding] = useState(false);
  
//   // Form state
//   const [formData, setFormData] = useState({
//     id: '',
//     name: '',
//     type: 'client',
//     balance: 0,
//     phone: '',
//     email: '',
//     address: '',
//     tax_id: '',
//     account_type: 'cash' // 'cash' or 'bank'
//   });
  
//   const [searchTerm, setSearchTerm] = useState('');

//   const fetchParties = async () => {
//     try {
//       setLoading(true);
//       setError('');
      
//       const data = await apiRequest('get_clients.php');
      
//       if (data && data.clients) {
//         setParties(data.clients.map(client => ({
//           ...client,
//           balance: parseFloat(client.balance) || 0
//         })));
//       } else {
//         throw new Error('No clients found or invalid response format');
//       }
//     } catch (err) {
//       setError(err.message || 'Error loading clients/vendors');
//       console.error('Error:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchParties();
//   }, []);

//   const handleEditClick = (party) => {
//     setIsAdding(false);
//     setFormData({
//       id: party.id,
//       name: party.name || '',
//       type: party.type || 'client',
//       balance: party.balance || 0,
//       phone: party.phone || '',
//       email: party.email || '',
//       address: party.address || '',
//       tax_id: party.tax_id || '',
//       account_type: party.account_type || 'cash'
//     });
//   };
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       setLoading(true);
//       setError('');
      
//       // Validate required fields
//       if (!formData.name.trim()) {
//         throw new Error('Name is required');
//       }
      
//       const balance = parseFloat(formData.balance);
//       if (isNaN(balance)) {
//         throw new Error('Please enter a valid balance');
//       }
      
//       const payload = {
//         ...formData,
//         balance: balance,
//         id: formData.id || undefined // Don't send ID for new entries
//       };
      
//       const endpoint = formData.id ? 'edit_client.php' : 'add_client.php';
//       const response = await apiRequest(endpoint, {
//         method: 'POST',
//         body: JSON.stringify(payload)
//       });
      
//       if (response.success) {
//         await fetchParties();
//         if (onUpdate) onUpdate();
//         resetForm();
//         alert(`Client ${formData.id ? 'updated' : 'added'} successfully!`);
//       } else {
//         throw new Error(response.message || 'Operation failed');
//       }
//     } catch (err) {
//       console.error('Error:', err);
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const resetForm = () => {
//     setFormData({
//       id: '',
//       name: '',
//       type: 'client',
//       balance: 0,
//       phone: '',
//       email: '',
//       address: '',
//       tax_id: '',
//       account_type: 'cash'
//     });
//     setIsAdding(false);
//   };

//   const handleAddNew = () => {
//     resetForm();
//     setIsAdding(true);
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: name === 'balance' ? parseFloat(value) || 0 : value
//     }));
//   };

//   const filteredParties = parties.filter(party => 
//     party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     party.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     (party.phone && party.phone.includes(searchTerm)) ||
//     (party.email && party.email.toLowerCase().includes(searchTerm.toLowerCase()))
//   );

//   return (
//     <div style={{ marginTop: '32px' }}>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
//         <h2>Clients & Vendors</h2>
//         <button 
//           onClick={handleAddNew}
//           style={{
//             padding: '8px 16px',
//             backgroundColor: '#4CAF50',
//             color: 'white',
//             border: 'none',
//             borderRadius: '4px',
//             cursor: 'pointer'
//           }}
//         >
//           + Add New
//         </button>
//       </div>
      
//       <div style={{ marginBottom: '16px', display: 'flex', gap: '10px' }}>
//         <input
//           type="text"
//           placeholder="Search by name, type, phone, or email..."
//           value={searchTerm}
//           onChange={(e) => setSearchTerm(e.target.value)}
//           style={{
//             padding: '8px',
//             flex: 1,
//             maxWidth: '400px',
//             borderRadius: '4px',
//             border: '1px solid #ddd'
//           }}
//         />
//         <button 
//           onClick={fetchParties}
//           disabled={loading}
//           style={{
//             padding: '8px 16px',
//             backgroundColor: '#2196F3',
//             color: 'white',
//             border: 'none',
//             borderRadius: '4px',
//             cursor: 'pointer',
//             display: 'flex',
//             alignItems: 'center',
//             gap: '5px'
//           }}
//         >
//           <span>⟳</span> Refresh
//         </button>
//       </div>

//       {/* Add/Edit Form Modal */}
//       {(isAdding || formData.id) && (
//         <div style={{
//           position: 'fixed',
//           top: 0,
//           left: 0,
//           right: 0,
//           bottom: 0,
//           backgroundColor: 'rgba(0,0,0,0.5)',
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'center',
//           zIndex: 1000
//         }}>
//           <div style={{
//             backgroundColor: 'white',
//             padding: '24px',
//             borderRadius: '8px',
//             width: '100%',
//             maxWidth: '500px',
//             maxHeight: '90vh',
//             overflowY: 'auto'
//           }}>
//             <h3>{formData.id ? 'Edit' : 'Add New'} {formData.type}</h3>
            
//             {error && (
//               <div style={{
//                 color: 'white',
//                 backgroundColor: '#f44336',
//                 padding: '10px',
//                 borderRadius: '4px',
//                 marginBottom: '16px'
//               }}>
//                 {error}
//               </div>
//             )}
            
//             <form onSubmit={handleSubmit}>
//               <div style={{ marginBottom: '16px' }}>
//                 <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
//                   Type
//                 </label>
//                 <select
//                   name="type"
//                   value={formData.type}
//                   onChange={handleInputChange}
//                   style={{
//                     width: '100%',
//                     padding: '8px',
//                     borderRadius: '4px',
//                     border: '1px solid #ddd'
//                   }}
//                 >
//                   <option value="client">Client</option>
//                   <option value="vendor">Vendor</option>
//                 </select>
//               </div>
              
//               <div style={{ marginBottom: '16px' }}>
//                 <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
//                   Name *
//                 </label>
//                 <input
//                   type="text"
//                   name="name"
//                   value={formData.name}
//                   onChange={handleInputChange}
//                   required
//                   style={{
//                     width: '100%',
//                     padding: '8px',
//                     borderRadius: '4px',
//                     border: '1px solid #ddd'
//                   }}
//                 />
//               </div>
              
//               <div style={{ marginBottom: '16px' }}>
//                 <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
//                   Balance
//                 </label>
//                 <input
//                   type="number"
//                   name="balance"
//                   step="0.01"
//                   value={formData.balance}
//                   onChange={handleInputChange}
//                   style={{
//                     width: '100%',
//                     padding: '8px',
//                     borderRadius: '4px',
//                     border: '1px solid #ddd'
//                   }}
//                 />
//               </div>
              
//               <div style={{ marginBottom: '16px' }}>
//                 <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
//                   Account Type
//                 </label>
//                 <select
//                   name="account_type"
//                   value={formData.account_type}
//                   onChange={handleInputChange}
//                   style={{
//                     width: '100%',
//                     padding: '8px',
//                     borderRadius: '4px',
//                     border: '1px solid #ddd'
//                   }}
//                 >
//                   <option value="cash">Cash</option>
//                   <option value="bank">Bank</option>
//                 </select>
//               </div>
              
//               <div style={{ marginBottom: '16px' }}>
//                 <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
//                   Phone
//                 </label>
//                 <input
//                   type="tel"
//                   name="phone"
//                   value={formData.phone}
//                   onChange={handleInputChange}
//                   style={{
//                     width: '100%',
//                     padding: '8px',
//                     borderRadius: '4px',
//                     border: '1px solid #ddd'
//                   }}
//                 />
//               </div>
              
//               <div style={{ marginBottom: '16px' }}>
//                 <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
//                   Email
//                 </label>
//                 <input
//                   type="email"
//                   name="email"
//                   value={formData.email}
//                   onChange={handleInputChange}
//                   style={{
//                     width: '100%',
//                     padding: '8px',
//                     borderRadius: '4px',
//                     border: '1px solid #ddd'
//                   }}
//                 />
//               </div>
              
//               <div style={{ marginBottom: '16px' }}>
//                 <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
//                   Address
//                 </label>
//                 <textarea
//                   name="address"
//                   value={formData.address}
//                   onChange={handleInputChange}
//                   rows="3"
//                   style={{
//                     width: '100%',
//                     padding: '8px',
//                     borderRadius: '4px',
//                     border: '1px solid #ddd',
//                     resize: 'vertical'
//                   }}
//                 />
//               </div>
              
//               <div style={{ marginBottom: '24px' }}>
//                 <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
//                   Tax ID
//                 </label>
//                 <input
//                   type="text"
//                   name="tax_id"
//                   value={formData.tax_id}
//                   onChange={handleInputChange}
//                   style={{
//                     width: '100%',
//                     padding: '8px',
//                     borderRadius: '4px',
//                     border: '1px solid #ddd'
//                   }}
//                 />
//               </div>
              
//               <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
//                 <button
//                   type="button"
//                   onClick={resetForm}
//                   disabled={loading}
//                   style={{
//                     padding: '8px 16px',
//                     backgroundColor: '#f5f5f5',
//                     border: '1px solid #ddd',
//                     borderRadius: '4px',
//                     cursor: 'pointer'
//                   }}
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={loading}
//                   style={{
//                     padding: '8px 16px',
//                     backgroundColor: '#4CAF50',
//                     color: 'white',
//                     border: 'none',
//                     borderRadius: '4px',
//                     cursor: 'pointer'
//                   }}
//                 >
//                   {loading ? 'Saving...' : 'Save'}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
      
//       {/* Error Message */}
//       {error && !isAdding && !formData.id && (
//         <div style={{
//           color: 'white',
//           backgroundColor: '#f44336',
//           padding: '10px',
//           borderRadius: '4px',
//           marginBottom: '16px',
//           display: 'inline-block'
//         }}>
//           {error}
//         </div>
//       )}

//       {/* Parties Table */}
//       <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #eee' }}>
//         <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//           <thead>
//             <tr style={{ backgroundColor: '#f5f5f5' }}>
//               <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Type</th>
//               <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
//               <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Contact</th>
//               <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Balance</th>
//               <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Account</th>
//               <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {loading && !parties.length ? (
//               <tr>
//                 <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
//                   <div style={{ display: 'flex', justifyContent: 'center' }}>
//                     <div className="spinner"></div>
//                   </div>
//                 </td>
//               </tr>
//             ) : filteredParties.length === 0 ? (
//               <tr>
//                 <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
//                   {searchTerm ? 'No matching parties found' : 'No parties available. Click "Add New" to get started.'}
//                 </td>
//               </tr>
//             ) : (
//               filteredParties.map(party => (
//                 <tr 
//                   key={party.id} 
//                   style={{ 
//                     borderBottom: '1px solid #eee',
//                     backgroundColor: formData.id === party.id ? '#f8f9fa' : 'transparent'
//                   }}
//                 >
//                   <td style={{ padding: '12px' }}>
//                     <span style={{
//                       display: 'inline-block',
//                       padding: '2px 8px',
//                       borderRadius: '12px',
//                       backgroundColor: party.type === 'vendor' ? '#ffebee' : '#e3f2fd',
//                       color: party.type === 'vendor' ? '#c62828' : '#1565c0',
//                       fontSize: '0.8em',
//                       fontWeight: '500',
//                       textTransform: 'capitalize'
//                     }}>
//                       {party.type}
//                     </span>
//                   </td>
//                   <td style={{ padding: '12px', fontWeight: '500' }}>{party.name}</td>
//                   <td style={{ padding: '12px' }}>
//                     <div>{party.phone || '—'}</div>
//                     <div style={{ fontSize: '0.9em', color: '#666' }}>{party.email || ''}</div>
//                   </td>
//                   <td style={{ 
//                     padding: '12px', 
//                     textAlign: 'right',
//                     fontWeight: '500',
//                     color: party.balance < 0 ? '#d32f2f' : '#2e7d32'
//                   }}>
//                     {party.balance < 0 ? '-' : ''}${Math.abs(party.balance).toFixed(2)}
//                   </td>
//                   <td style={{ padding: '12px', textAlign: 'right' }}>
//                     <span style={{
//                       display: 'inline-block',
//                       padding: '2px 8px',
//                       borderRadius: '12px',
//                       backgroundColor: party.account_type === 'bank' ? '#e3f2fd' : '#e8f5e9',
//                       color: party.account_type === 'bank' ? '#1565c0' : '#2e7d32',
//                       fontSize: '0.8em',
//                       fontWeight: '500',
//                       textTransform: 'capitalize'
//                     }}>
//                       {party.account_type || 'cash'}
//                     </span>
//                   </td>
//                   <td style={{ padding: '12px', textAlign: 'center' }}>
//                     <button
//                       onClick={() => handleEditClick(party)}
//                       style={{
//                         padding: '6px 12px',
//                         backgroundColor: '#2196F3',
//                         color: 'white',
//                         border: 'none',
//                         borderRadius: '4px',
//                         cursor: 'pointer',
//                         display: 'inline-flex',
//                         alignItems: 'center',
//                         gap: '4px',
//                         fontSize: '0.9em'
//                       }}
//                     >
//                       <span>✏️</span> Edit
//                     </button>
//                   </td>
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// };

// // Add some basic styles for the loading spinner
// const styles = `
//   @keyframes spin {
//     0% { transform: rotate(0deg); }
//     100% { transform: rotate(360deg); }
//   }
//   .spinner {
//     border: 3px solid #f3f3f3;
//     border-top: 3px solid #3498db;
//     border-radius: 50%;
//     width: 24px;
//     height: 24px;
//     animation: spin 1s linear infinite;
//   }
// `;

// // Add styles to the document head
// const styleElement = document.createElement('style');
// styleElement.textContent = styles;
// document.head.appendChild(styleElement);

// // Export the component as default for backward compatibility
// const WrappedPartyBalanceEditor = (props) => {
//   // The API calls are now handled by the apiRequest utility
//   return <PartyBalanceEditor {...props} />;
// };

// export default WrappedPartyBalanceEditor;

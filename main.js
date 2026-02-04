const API_URL = 'https://api.escuelajs.co/api/v1/products';

// State
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let rowsPerPage = 5;
let sortCol = null;
let sortAsc = true;
let searchQuery = '';

// DOM Elements
const tableBody = document.getElementById('productTableBody');
const paginationEl = document.getElementById('pagination');
const searchInput = document.getElementById('searchInput');
const rowsPerPageSelect = document.getElementById('rowsPerPage');
const showingInfo = document.getElementById('showingInfo');
const btnExport = document.getElementById('btnExport');
const btnSaveNew = document.getElementById('btnSaveNew');
const btnUpdate = document.getElementById('btnUpdate');
const sortHeaders = document.querySelectorAll('.sortable');

// Modals
const productModalEl = document.getElementById('productModal');
const createModalEl = document.getElementById('createModal');
let productModalInstance;
let createModalInstance;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    productModalInstance = new bootstrap.Modal(productModalEl);
    createModalInstance = new bootstrap.Modal(createModalEl);
    
    fetchProducts();
    setupEventListeners();
});

// Fetch Data
async function fetchProducts() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        allProducts = await response.json();
        // Initial filter/sort application
        applyFilterAndSort();
    } catch (error) {
        console.error('Error fetching products:', error);
        alert('Có lỗi xảy ra khi tải dữ liệu!');
    }
}

// Event Listeners
function setupEventListeners() {
    // Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        currentPage = 1; // Reset to first page on search
        applyFilterAndSort();
    });

    // Rows Per Page
    rowsPerPageSelect.addEventListener('change', (e) => {
        rowsPerPage = parseInt(e.target.value);
        currentPage = 1;
        renderTable();
        renderPagination();
    });

    // Sort
    sortHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const col = header.dataset.sort;
            if (sortCol === col) {
                sortAsc = !sortAsc;
            } else {
                sortCol = col;
                sortAsc = true;
            }
            updateSortIcons();
            applyFilterAndSort();
        });
    });

    // Export CSV
    btnExport.addEventListener('click', exportToCSV);

    // Create Product
    btnSaveNew.addEventListener('click', createProduct);

    // Update Product
    btnUpdate.addEventListener('click', updateProduct);
}

// Logic: Filter & Sort -> Render
function applyFilterAndSort() {
    // 1. Filter
    filteredProducts = allProducts.filter(p => 
        p.title.toLowerCase().includes(searchQuery)
    );

    // 2. Sort
    if (sortCol) {
        filteredProducts.sort((a, b) => {
            let valA = a[sortCol];
            let valB = b[sortCol];

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortAsc ? -1 : 1;
            if (valA > valB) return sortAsc ? 1 : -1;
            return 0;
        });
    }

    renderTable();
    renderPagination();
}

// Render Table
function renderTable() {
    tableBody.innerHTML = '';
    
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredProducts.slice(start, end);

    // Update Showing Info
    if (filteredProducts.length === 0) {
        showingInfo.textContent = 'Không tìm thấy dữ liệu';
    } else {
        showingInfo.textContent = `Hiển thị ${start + 1}-${Math.min(end, filteredProducts.length)} trong tổng số ${filteredProducts.length}`;
    }

    pageData.forEach(product => {
        const tr = document.createElement('tr');
        tr.className = 'cursor-pointer';
        tr.onclick = (e) => {
            // Prevent opening modal if clicking on specific interactive elements if any, 
            // but here clicking row opens modal
            openProductModal(product.id);
        };

        // Tooltip for description: We can use 'title' attribute for simple native tooltip 
        // or data-bs-toggle="tooltip" for bootstrap. 
        // Requirement: "Description will be displayed when hovering over the corresponding line"
        // Putting it on the TR makes the most sense.
        tr.setAttribute('title', product.description);
        tr.setAttribute('data-bs-toggle', 'tooltip');
        tr.setAttribute('data-bs-placement', 'top');

        // Image handling
        let imgHtml = '<span class="text-muted">No Image</span>';
        if (product.images && product.images.length > 0) {
            // Clean up image URL if needed (API sometimes returns brackets in string)
            let imgUrl = product.images[0];
            if (typeof imgUrl === 'string') {
                imgUrl = imgUrl.replace(/[\[\]"]/g, ''); // Fix common API issue with extra quotes/brackets
                if (imgUrl.startsWith('http')) {
                    imgHtml = `<img src="${imgUrl}" class="product-img-thumb" alt="${product.title}" onerror="this.src='https://placehold.co/50'">`;
                }
            }
        }

        tr.innerHTML = `
            <td>${product.id}</td>
            <td>${product.title}</td>
            <td>$${product.price}</td>
            <td>${product.category ? product.category.name : 'N/A'}</td>
            <td>${imgHtml}</td>
        `;
        tableBody.appendChild(tr);
    });

    // Re-initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Render Pagination
function renderPagination() {
    paginationEl.innerHTML = '';
    const totalPages = Math.ceil(filteredProducts.length / rowsPerPage);

    if (totalPages <= 1) return;

    // Previous
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#">Prev</a>`;
    prevLi.onclick = (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            renderTable();
            renderPagination();
        }
    };
    paginationEl.appendChild(prevLi);

    // Page Numbers (Simple logic: show all or simple range)
    // For simplicity with potentially many pages, let's show basic range
    // Start with simplified view: 1..current..last if many pages, or just loop all if < 10
    // Given 5/10/20 items, page count can be high. Let's limit visible buttons.
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
         addPageItem(1);
         if (startPage > 2) addEllipsis();
    }

    for (let i = startPage; i <= endPage; i++) {
        addPageItem(i);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) addEllipsis();
        addPageItem(totalPages);
    }

    // Next
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#">Next</a>`;
    nextLi.onclick = (e) => {
        e.preventDefault();
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
            renderPagination();
        }
    };
    paginationEl.appendChild(nextLi);

    function addPageItem(page) {
        const li = document.createElement('li');
        li.className = `page-item ${currentPage === page ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${page}</a>`;
        li.onclick = (e) => {
            e.preventDefault();
            currentPage = page;
            renderTable();
            renderPagination();
        };
        paginationEl.appendChild(li);
    }

    function addEllipsis() {
        const li = document.createElement('li');
        li.className = 'page-item disabled';
        li.innerHTML = '<span class="page-link">...</span>';
        paginationEl.appendChild(li);
    }
}

function updateSortIcons() {
    sortHeaders.forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (header.dataset.sort === sortCol) {
            header.classList.add(sortAsc ? 'sort-asc' : 'sort-desc');
        }
    });
}

// Modal & API Actions
function openProductModal(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    document.getElementById('editId').value = product.id;
    document.getElementById('editTitle').value = product.title;
    document.getElementById('editPrice').value = product.price;
    document.getElementById('editDescription').value = product.description;

    productModalInstance.show();
}

async function createProduct() {
    const title = document.getElementById('createTitle').value;
    const price = document.getElementById('createPrice').value;
    const description = document.getElementById('createDescription').value;
    const categoryId = document.getElementById('createCategoryId').value;
    const imageUrl = document.getElementById('createImageUrl').value;

    if (!title || !price || !description) {
        alert('Vui lòng điền đầy đủ thông tin!');
        return;
    }

    const newProduct = {
        title,
        price: parseFloat(price),
        description,
        categoryId: parseInt(categoryId),
        images: [imageUrl]
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProduct)
        });

        if (response.ok) {
            const created = await response.json();
            alert('Tạo sản phẩm thành công!');
            createModalInstance.hide();
            document.getElementById('createForm').reset();
            // Add to local list and re-render
            allProducts.unshift(created);
            applyFilterAndSort();
        } else {
            const errorData = await response.json();
            console.error('Create Error:', errorData);
            alert(`Lỗi khi tạo sản phẩm: ${JSON.stringify(errorData)}`);
        }
    } catch (error) {
        console.error(error);
        alert('Lỗi kết nối');
    }
}

async function updateProduct() {
    const id = document.getElementById('editId').value;
    const title = document.getElementById('editTitle').value;
    const price = document.getElementById('editPrice').value;
    const description = document.getElementById('editDescription').value;

    // Get existing product to preserve images and category
    const existingProduct = allProducts.find(p => p.id == id);
    
    const updatedData = {
        title,
        price: parseFloat(price),
        description,
        // Include existing images and categoryId to satisfy strict PUT requirements
        images: existingProduct ? existingProduct.images : ['https://placehold.co/600x400'],
        categoryId: existingProduct ? existingProduct.category.id : 1
    };

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        if (response.ok) {
            const updated = await response.json();
            alert('Cập nhật thành công!');
            productModalInstance.hide();
            
            // Update local data
            const index = allProducts.findIndex(p => p.id == id);
            if (index !== -1) {
                // Merge updates, keep other fields like images/category
                allProducts[index] = { ...allProducts[index], ...updated };
                applyFilterAndSort();
            }
        } else {
            const errorData = await response.json();
            console.error('Update Error:', errorData);
            alert(`Lỗi khi cập nhật: ${JSON.stringify(errorData)}`);
        }
    } catch (error) {
        console.error(error);
        alert('Lỗi kết nối');
    }
}

// Export CSV
function exportToCSV() {
    if (filteredProducts.length === 0) {
        alert('Không có dữ liệu để xuất');
        return;
    }

    // Headers
    const headers = ['ID', 'Title', 'Price', 'Category', 'Description'];
    
    // Rows
    const rows = filteredProducts.map(p => [
        p.id,
        `"${p.title.replace(/"/g, '""')}"`, // Escape quotes
        p.price,
        `"${(p.category ? p.category.name : '').replace(/"/g, '""')}"`,
        `"${p.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = [
        headers.join(','), 
        ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'products_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

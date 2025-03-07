document.addEventListener('DOMContentLoaded', function () {
    const BASE_URL = 'http://127.0.0.1:3000/api';

    async function fetchData() {
        try {
            const response = await fetch(`${BASE_URL}/businesses`);
            const data = await response.json();
            document.getElementById("output").innerText = JSON.stringify(data, null, 2);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }

    // DOM Elements
    const stateFilter = document.getElementById('state-filter');
    const selectedCitiesEl = document.getElementById('selected-cities');
    const cityFilter = document.getElementById('city-filter');
    const categoryFilter = document.getElementById('category-filter');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const exportVisibleBtn = document.getElementById('export-visible');
    const exportAllBtn = document.getElementById('export-all');
    const exportFormatSelect = document.getElementById('export-format');

    // Grid and Pagination Elements
    const gridContainer = document.getElementById('business-grid');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    const totalRecordsEl = document.getElementById('total-records');
    const filteredRecordsEl = document.getElementById('filtered-records');
    const selectedCountriesEl = document.getElementById('selected-countries');
    const selectedCategoriesEl = document.getElementById('selected-categories');

    // AG Grid Configuration
    const gridOptions = {
        columnDefs: [
            { field: '_id', headerName: 'ID', sortable: true, filter: true, width: 80 },
            { field: 'Business Name', headerName: 'Business Name', sortable: true, filter: true },
            { field: 'Origin URL', headerName: 'URL', sortable: true, filter: true },
            { field: 'State', headerName: 'State', sortable: true, filter: true },
            { field: 'City', headerName: 'City', sortable: true, filter: true },
            { field: 'Categories', headerName: 'Categories', sortable: true, filter: true },
            { field: 'Phone', headerName: 'Phone', sortable: true, filter: true },
            { field: 'Address', headerName: 'Address', sortable: true, filter: true },
        ],
        defaultColDef: {
            flex: 1,
            minWidth: 100,
            resizable: true
        },
        pagination: true,
        paginationPageSize: 25
    };

    // Initialize the grid
    const grid = new agGrid.Grid(gridContainer, gridOptions);

    // Toast Notification Function
    function showToast(message, isError = false) {
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast ${isError ? 'error' : ''}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    // Download File Function
    function downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    // Populate Filters function
    async function populateFilters() {
        try {
            // Fetch states
            const statesResponse = await fetch(`${BASE_URL}/filters/states`);
            const states = await statesResponse.json();
            states.forEach(state => {
                const option = document.createElement('option');
                option.value = state;
                option.textContent = state;
                stateFilter.appendChild(option);
            });

            // Fetch categories
            const categoriesResponse = await fetch(`${BASE_URL}/filters/categories`);
            const categories = await categoriesResponse.json();
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating filters:', error);
        }
    }

    async function fetchBusinesses(page = 1, filters = {}) {
        try {
            const params = new URLSearchParams({
                page: page,
                ...filters
            });

            const response = await fetch(`${BASE_URL}/businesses?${params}`);
            const data = await response.json();

            gridOptions.api.setRowData(data.businesses);

            totalRecordsEl.textContent = '11,798,652'; // Update with your total records
            filteredRecordsEl.textContent = data.total_count.toLocaleString();
            selectedCategoriesEl.textContent = filters.category || 'All';

            pageInfo.textContent = `Page ${data.page} of ${data.total_pages}`;
            prevPageBtn.disabled = data.page === 1;
            nextPageBtn.disabled = data.page === data.total_pages;

        } catch (error) {
            console.error('Error fetching businesses:', error);
        }
    }

    // Export Functionality
    async function exportData(type) {
        try {
            const format = exportFormatSelect.value;
            const filters = {
                state: stateFilter.value,
                city: cityFilter.value,
                category: categoryFilter.value
            };

            const response = await fetch(`${BASE_URL}/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: type,
                    filters: filters
                })
            });

            const data = await response.json();

            switch (format) {
                case 'csv':
                    const csvContent = Papa.unparse(data);
                    downloadFile(csvContent, 'business_data.csv', 'text/csv');
                    showToast('Data exported as CSV');
                    break;
                case 'json':
                    const jsonContent = JSON.stringify(data, null, 2);
                    downloadFile(jsonContent, 'business_data.json', 'application/json');
                    showToast('Data exported as JSON');
                    break;
                case 'excel':
                    const excelContent = Papa.unparse(data);
                    downloadFile(excelContent, 'business_data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                    showToast('Data exported as Excel');
                    break;
                default:
                    showToast('Unsupported export format', true);
            }
        } catch (error) {
            console.error('Export error:', error);
            showToast('Export failed', true);
        }
    }

    // Populate cities based on selected state
    stateFilter.addEventListener('change', async function () {
        const selectedState = this.value;
        cityFilter.innerHTML = '<option value="">All Cities</option>';

        if (selectedState) {
            try {
                const response = await fetch(`${BASE_URL}/filters/cities?state=${selectedState}`);
                const cities = await response.json();

                cities.forEach(city => {
                    const option = document.createElement('option');
                    option.value = city;
                    option.textContent = city;
                    cityFilter.appendChild(option);
                });
                cityFilter.disabled = false;
            } catch (error) {
                console.error('Error fetching cities:', error);
            }
        } else {
            cityFilter.disabled = true;
        }
    });

    // Apply Filters
    applyFiltersBtn.addEventListener('click', function () {
        const filters = {
            state: stateFilter.value,
            city: cityFilter.value,
            category: categoryFilter.value
        };

        Object.keys(filters).forEach(key => {
            if (!filters[key]) delete filters[key];
        });

        fetchBusinesses(1, filters);
    });

    // Reset Filters
    resetFiltersBtn.addEventListener('click', function () {
        stateFilter.value = '';
        stateFilter.disabled = true;
        cityFilter.value = '';
        cityFilter.disabled = true;
        categoryFilter.value = '';

        fetchBusinesses();
    });

    // Pagination Controls
    prevPageBtn.addEventListener('click', function () {
        const currentPage = parseInt(pageInfo.textContent.split(' ')[1]);
        fetchBusinesses(currentPage - 1);
    });

    nextPageBtn.addEventListener('click', function () {
        const currentPage = parseInt(pageInfo.textContent.split(' ')[1]);
        fetchBusinesses(currentPage + 1);
    });

    // Export Buttons
    exportVisibleBtn.addEventListener('click', () => exportData('visible'));
    exportAllBtn.addEventListener('click', () => exportData('all'));

    // Keyboard Shortcuts
    document.addEventListener('keydown', function (event) {
        if (event.ctrlKey && event.key === 'f') {
            event.preventDefault();
            stateFilter.focus();
        }

        if (event.ctrlKey && !event.shiftKey && event.key === 'e') {
            event.preventDefault();
            exportData('visible');
        }

        if (event.ctrlKey && event.shiftKey && event.key === 'e') {
            event.preventDefault();
            exportData('all');
        }

        if (event.ctrlKey && event.key === 'r') {
            event.preventDefault();
            resetFiltersBtn.click();
        }

        if (event.key === 'ArrowLeft' && !prevPageBtn.disabled) {
            event.preventDefault();
            prevPageBtn.click();
        }

        if (event.key === 'ArrowRight' && !nextPageBtn.disabled) {
            event.preventDefault();
            nextPageBtn.click();
        }
    });

    // Keyboard Shortcuts Panel Toggle
    const toggleShortcutsBtn = document.getElementById('toggle-shortcuts');
    const shortcutsPanel = document.getElementById('shortcuts-panel');

    toggleShortcutsBtn.addEventListener('click', function () {
        shortcutsPanel.classList.toggle('hidden');
    });

    document.addEventListener('click', function (event) {
        if (!shortcutsPanel.classList.contains('hidden') &&
            !shortcutsPanel.contains(event.target) &&
            event.target !== toggleShortcutsBtn) {
            shortcutsPanel.classList.add('hidden');
        }
    });

    // Initial setup
    populateFilters();
    fetchBusinesses();
});
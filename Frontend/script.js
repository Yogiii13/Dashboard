document.addEventListener('DOMContentLoaded', function () {
    const BASE_URL = 'http://127.0.0.1:3000/api';

    // State management
    let currentPage = 1;
    let totalPages = 1;
    let currentFilters = {};
    let loadingData = false;
    let debounceTimer;

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
    const loadingIndicator = document.getElementById('loading-indicator');

    // Show loading indicator
    function showLoading() {
        loadingData = true;
        if (loadingIndicator) {
            loadingIndicator.style.display = 'flex';
        }

        // Disable interactive elements while loading
        applyFiltersBtn.disabled = true;
        if (prevPageBtn) prevPageBtn.disabled = true;
        if (nextPageBtn) nextPageBtn.disabled = true;
    }

    // Hide loading indicator
    function hideLoading() {
        loadingData = false;
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }

        // Re-enable interactive elements
        applyFiltersBtn.disabled = false;
        updatePaginationButtons();
    }

    // AG Grid Configuration with virtualization
    const gridOptions = {
        columnDefs: [
            { field: '_id', headerName: 'ID', sortable: true, filter: true, width: 80 },
            { field: 'Business Name', headerName: 'Business Name', sortable: true, filter: true },
            { field: 'Origin', headerName: 'Origin URL', sortable: true, filter: true },
            { field: 'State', headerName: 'State', sortable: true, filter: true },
            { field: 'City', headerName: 'City', sortable: true, filter: true },
            { field: 'Categories', headerName: 'Categories', sortable: true, filter: true },
            { field: 'Phone', headerName: 'Phone', sortable: true, filter: true },
            { field: 'Address', headerName: 'Address', sortable: true, filter: true },
        ],
        defaultColDef: {
            flex: 1,
            minWidth: 100,
            resizable: true,
            filter: true
        },
        pagination: true,
        paginationPageSize: 25,
        cacheBlockSize: 25, // For infinite scrolling/virtualization
        rowBuffer: 10,
        rowModelType: 'clientSide', // Use 'infinite' for server-side paging
        suppressFieldDotNotation: true,
        onGridReady: onGridReady
    };

    // Function to handle grid initialization
    function onGridReady(params) {
        // Implement any initialization code here
        params.api.sizeColumnsToFit();
        window.addEventListener('resize', () => {
            setTimeout(() => {
                params.api.sizeColumnsToFit();
            }, 100);
        });
    }

    // Initialize the grid
    const grid = new agGrid.Grid(gridContainer, gridOptions);

    // Update pagination buttons based on current page
    function updatePaginationButtons() {
        if (prevPageBtn && nextPageBtn) {
            prevPageBtn.disabled = loadingData || currentPage === 1;
            nextPageBtn.disabled = loadingData || currentPage === totalPages;
        }
    }

    // Toast Notification Function
    function showToast(message, isError = false) {
        // Remove existing toast if any
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Create new toast
        const toast = document.createElement('div');
        toast.className = `toast ${isError ? 'error' : ''}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Hide toast after 3 seconds
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

    // Debounce function to prevent excessive API calls
    function debounce(func, delay) {
        return function () {
            const context = this;
            const args = arguments;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(context, args), delay);
        };
    }

    // Populate Filters function - asynchronous loading
    async function populateFilters() {
        try {
            showToast('Loading filters...');

            // Fetch states
            const statesPromise = fetch(`${BASE_URL}/filters/states`)
                .then(response => response.json())
                .then(states => {
                    states.forEach(state => {
                        const option = document.createElement('option');
                        option.value = state;
                        option.textContent = state;
                        stateFilter.appendChild(option);
                    });
                });

            // Fetch categories (limited to top 100)
            const categoriesPromise = fetch(`${BASE_URL}/filters/categories`)
                .then(response => response.json())
                .then(categories => {
                    categories.forEach(category => {
                        const option = document.createElement('option');
                        option.value = category;
                        option.textContent = category;
                        categoryFilter.appendChild(option);
                    });
                });

            // Wait for both promises to resolve
            await Promise.all([statesPromise, categoriesPromise]);

            // Don't load cities initially to reduce initial load time
            // Cities will be populated based on state selection

            showToast('Filters loaded successfully');
        } catch (error) {
            console.error('Error populating filters:', error);
            showToast('Error loading filters', true);
        }
    }

    // Function to fetch businesses with optimization
    async function fetchBusinesses(page = 1, filters = {}, isInitialLoad = false) {
        if (loadingData) return; // Prevent multiple concurrent requests

        try {
            showLoading();

            // Store current page and filters for pagination
            currentPage = page;
            currentFilters = { ...filters };

            // Construct query parameters
            const params = new URLSearchParams({
                page: page,
                ...filters
            });

            const response = await fetch(`${BASE_URL}/businesses?${params}`);

            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            const data = await response.json();

            // Update grid data with new rows
            gridOptions.api.setRowData(data.businesses);

            // Update pagination and stats
            totalRecordsEl.textContent = '11,798,652'; // Total records
            filteredRecordsEl.textContent = data.total_count.toLocaleString();
            selectedCitiesEl.textContent = filters.city || 'All';
            selectedCategoriesEl.textContent = filters.category || 'All';

            // Update pagination state
            totalPages = data.total_pages;
            if (pageInfo) {
                pageInfo.textContent = `Page ${data.page} of ${data.total_pages}`;
            }

            updatePaginationButtons();

            // If initial load, show successful message
            if (isInitialLoad) {
                showToast('Data loaded successfully');
            }

        } catch (error) {
            console.error('Error fetching businesses:', error);
            showToast(`Error loading data: ${error.message}`, true);
        } finally {
            hideLoading();
        }
    }

    // Export Functionality with progress indicator
    async function exportData(type) {
        try {
            showLoading();
            showToast('Preparing export...');

            const format = exportFormatSelect.value;
            const filters = {
                state: stateFilter.value,
                city: cityFilter.value,
                category: categoryFilter.value
            };

            // Remove empty filter values
            Object.keys(filters).forEach(key => {
                if (!filters[key]) delete filters[key];
            });

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

            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            const data = await response.json();

            // Check if we have data to export
            if (!data || data.length === 0) {
                showToast('No data to export', true);
                return;
            }

            // Export based on selected format
            switch (format) {
                case 'csv':
                    const csvContent = Papa.unparse(data);
                    downloadFile(csvContent, 'business_data.csv', 'text/csv');
                    showToast(`Exported ${data.length} records as CSV`);
                    break;
                case 'json':
                    const jsonContent = JSON.stringify(data, null, 2);
                    downloadFile(jsonContent, 'business_data.json', 'application/json');
                    showToast(`Exported ${data.length} records as JSON`);
                    break;
                case 'excel':
                    const excelContent = Papa.unparse(data);
                    downloadFile(excelContent, 'business_data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                    showToast(`Exported ${data.length} records as Excel`);
                    break;
                default:
                    showToast('Unsupported export format', true);
            }
        } catch (error) {
            console.error('Export error:', error);
            showToast(`Export failed: ${error.message}`, true);
        } finally {
            hideLoading();
        }
    }

    // Load cities based on selected state - with debounce
    stateFilter.addEventListener('change', debounce(async function () {
        const selectedState = this.value;
        cityFilter.innerHTML = '<option value="">All Cities</option>';
        cityFilter.disabled = true;

        if (selectedState) {
            try {
                showToast('Loading cities...');
                const response = await fetch(`${BASE_URL}/filters/cities?state=${selectedState}`);
                const cities = await response.json();

                cities.forEach(city => {
                    const option = document.createElement('option');
                    option.value = city;
                    option.textContent = city;
                    cityFilter.appendChild(option);
                });
                cityFilter.disabled = false;
                showToast(`Loaded ${cities.length} cities`);
            } catch (error) {
                console.error('Error fetching cities:', error);
                showToast('Error loading cities', true);
            }
        }
    }, 300));

    // Apply Filters - with validation
    applyFiltersBtn.addEventListener('click', function () {
        if (loadingData) return;

        const filters = {
            state: stateFilter.value,
            city: cityFilter.value,
            category: categoryFilter.value
        };

        // Remove empty filter values
        Object.keys(filters).forEach(key => {
            if (!filters[key]) delete filters[key];
        });

        // Reset to page 1 when applying new filters
        fetchBusinesses(1, filters);
    });

    // Reset Filters
    resetFiltersBtn.addEventListener('click', function () {
        if (loadingData) return;

        stateFilter.value = '';
        cityFilter.value = '';
        cityFilter.disabled = true;
        categoryFilter.value = '';

        fetchBusinesses(1, {});
    });

    // Pagination Controls
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', function () {
            if (loadingData || currentPage <= 1) return;
            fetchBusinesses(currentPage - 1, currentFilters);
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', function () {
            if (loadingData || currentPage >= totalPages) return;
            fetchBusinesses(currentPage + 1, currentFilters);
        });
    }

    // Export Buttons with confirmation for large exports
    exportVisibleBtn.addEventListener('click', () => {
        if (loadingData) return;
        exportData('visible');
    });

    exportAllBtn.addEventListener('click', () => {
        if (loadingData) return;

        // Show confirmation for potentially large exports
        if (confirm('This may export a large number of records. Continue?')) {
            exportData('all');
        }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', function (event) {
        if (loadingData) return; // Disable shortcuts while loading

        // Ctrl + F: Focus on state filter
        if (event.ctrlKey && event.key === 'f') {
            event.preventDefault();
            stateFilter.focus();
        }

        // Ctrl + E: Export visible data
        if (event.ctrlKey && !event.shiftKey && event.key === 'e') {
            event.preventDefault();
            exportData('visible');
        }

        // Ctrl + Shift + E: Export all data
        if (event.ctrlKey && event.shiftKey && event.key === 'e') {
            event.preventDefault();
            if (confirm('This may export a large number of records. Continue?')) {
                exportData('all');
            }
        }

        // Ctrl + R: Reset filters
        if (event.ctrlKey && event.key === 'r') {
            event.preventDefault();
            resetFiltersBtn.click();
        }

        // Left arrow: Previous page
        if (event.key === 'ArrowLeft' && prevPageBtn && !prevPageBtn.disabled) {
            event.preventDefault();
            prevPageBtn.click();
        }

        // Right arrow: Next page
        if (event.key === 'ArrowRight' && nextPageBtn && !nextPageBtn.disabled) {
            event.preventDefault();
            nextPageBtn.click();
        }
    });

    // Keyboard Shortcuts Panel Toggle
    const toggleShortcutsBtn = document.getElementById('toggle-shortcuts');
    const shortcutsPanel = document.getElementById('shortcuts-panel');

    if (toggleShortcutsBtn && shortcutsPanel) {
        toggleShortcutsBtn.addEventListener('click', function () {
            shortcutsPanel.classList.toggle('hidden');
        });

        // Close shortcuts panel when clicking outside
        document.addEventListener('click', function (event) {
            if (!shortcutsPanel.classList.contains('hidden') &&
                !shortcutsPanel.contains(event.target) &&
                event.target !== toggleShortcutsBtn) {
                shortcutsPanel.classList.add('hidden');
            }
        });
    }

    // Initial setup with loading sequence
    populateFilters()
        .then(() => fetchBusinesses(1, {}, true))
        .catch(error => {
            console.error('Error in initial setup:', error);
            showToast('Error initializing application', true);
        });
});
export class TableSorter {
    constructor(tableSelector) {
        this.tableSelector = tableSelector;
        this.table = null;
        this.sortDirection = {
            team: true,
            points: true
        };
    }

    init() {
        try {
            this.table = document.querySelector(this.tableSelector);
            if (!this.table) {
                console.log("TableSorter: table not found.");
                return;
            }

            this.table.addEventListener("click", (event) => {
                const headerCell = event.target.closest("th[data-sort]");

                if (!headerCell) {
                    return;
                }

                const sortKey = headerCell.dataset.sort;
                this.sortRows(sortKey);
            });

            console.log("TableSorter initialized successfully.");
        } catch (error) {
            console.log("Error in TableSorter.init:", error);
        }
    }

    sortRows(sortKey) {
        try {
            const tbody = this.table.querySelector("tbody");
            const rows = Array.from(tbody.querySelectorAll("tr"));
            const isAscending = this.sortDirection[sortKey] ?? true;
            const headerCell = this.table.querySelector(`th[data-sort="${sortKey}"]`);
            const columnIndex = headerCell
                ? Array.from(headerCell.parentElement.children).indexOf(headerCell)
                : 0;
            const numericColumns = new Set(["position", "played", "won", "draw", "lost", "goalDiff", "points"]);

            rows.sort((firstRow, secondRow) => {
                const firstValue = firstRow.children[columnIndex]?.textContent.trim() ?? "";
                const secondValue = secondRow.children[columnIndex]?.textContent.trim() ?? "";

                if (numericColumns.has(sortKey)) {
                    const firstNumber = Number(firstValue.replace(/[^\d.-]/g, ""));
                    const secondNumber = Number(secondValue.replace(/[^\d.-]/g, ""));
                    return isAscending ? firstNumber - secondNumber : secondNumber - firstNumber;
                }

                return isAscending
                    ? firstValue.localeCompare(secondValue)
                    : secondValue.localeCompare(firstValue);
            });

            
            tbody.innerHTML = rows.map((row) => row.outerHTML).join("");

            this.sortDirection[sortKey] = !isAscending;
            console.log(`Table sorted by field ${sortKey}.`);
        } catch (error) {
            console.log("Error in TableSorter.sortRows:", error);
        }
    }
}

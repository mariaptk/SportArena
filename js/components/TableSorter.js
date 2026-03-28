export class TableSorter {
    constructor(tableSelector) {
        this.table = document.querySelector(tableSelector);
        this.sortDirection = {
            team: true,
            points: true
        };
    }

    init() {
        try {
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
            const isAscending = this.sortDirection[sortKey];

            rows.sort((firstRow, secondRow) => {
                const firstValue = firstRow.children[sortKey === "team" ? 0 : 1].textContent.trim();
                const secondValue = secondRow.children[sortKey === "team" ? 0 : 1].textContent.trim();

                if (sortKey === "points") {
                    return isAscending ? Number(firstValue) - Number(secondValue) : Number(secondValue) - Number(firstValue);
                }

                return isAscending
                    ? firstValue.localeCompare(secondValue)
                    : secondValue.localeCompare(firstValue);
            });

            // Используем innerHTML по требованиям лабораторной работы:
            // формируем новый HTML строк таблицы после сортировки.
            tbody.innerHTML = rows.map((row) => row.outerHTML).join("");

            this.sortDirection[sortKey] = !isAscending;
            console.log(`Table sorted by field ${sortKey}.`);
        } catch (error) {
            console.log("Error in TableSorter.sortRows:", error);
        }
    }
}

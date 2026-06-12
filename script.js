class CoffeeTracker {
    constructor() {
        this.coffeeData = JSON.parse(localStorage.getItem('coffeeData')) || [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDisplay();
        this.setCurrentTime();
    }

    setupEventListeners() {
        // Add coffee button
        document.getElementById('addCoffeeBtn').addEventListener('click', () => {
            this.showAddForm();
        });

        // Reset button
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetToday();
        });

        // Cancel button
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.hideAddForm();
        });

        // Coffee form submission
        document.getElementById('coffeeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCoffee();
        });
    }

    showAddForm() {
        document.getElementById('addCoffeeForm').style.display = 'block';
        document.getElementById('addCoffeeForm').scrollIntoView({ behavior: 'smooth' });
        this.setCurrentTime();
    }

    hideAddForm() {
        document.getElementById('addCoffeeForm').style.display = 'none';
        this.clearForm();
    }

    setCurrentTime() {
        const now = new Date();
        const timeString = now.toTimeString().slice(0, 5);
        document.getElementById('coffeeTime').value = timeString;
    }

    addCoffee() {
        const type = document.getElementById('coffeeType').value;
        const size = document.getElementById('coffeeSize').value;
        const time = document.getElementById('coffeeTime').value;
        const notes = document.getElementById('coffeeNotes').value;

        if (!type || !size || !time) {
            alert('Please fill in all required fields');
            return;
        }

        const coffee = {
            id: Date.now(),
            type,
            size,
            time,
            notes,
            date: new Date().toDateString()
        };

        this.coffeeData.push(coffee);
        this.saveData();
        this.updateDisplay();
        this.hideAddForm();
        
        // Show success message
        this.showNotification('Coffee added successfully! ☕');
    }

    deleteCoffee(id) {
        if (confirm('Are you sure you want to delete this coffee entry?')) {
            this.coffeeData = this.coffeeData.filter(coffee => coffee.id !== id);
            this.saveData();
            this.updateDisplay();
            this.showNotification('Coffee entry deleted');
        }
    }

    resetToday() {
        if (confirm('Are you sure you want to reset today\'s coffee count?')) {
            const today = new Date().toDateString();
            this.coffeeData = this.coffeeData.filter(coffee => coffee.date !== today);
            this.saveData();
            this.updateDisplay();
            this.showNotification('Today\'s coffee count has been reset');
        }
    }

    getTodaysCoffee() {
        const today = new Date().toDateString();
        return this.coffeeData.filter(coffee => coffee.date === today);
    }

    getLastSevenDaysData() {
        const countsByDate = this.coffeeData.reduce((counts, coffee) => {
            const dateKey = new Date(coffee.date).toDateString();
            counts[dateKey] = (counts[dateKey] || 0) + 1;
            return counts;
        }, {});
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return Array.from({ length: 7 }, (_, index) => {
            const date = new Date(today);
            date.setDate(today.getDate() - (6 - index));

            return {
                dateKey: date.toDateString(),
                label: date.toLocaleDateString(undefined, { weekday: 'short' }),
                fullLabel: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
                count: countsByDate[date.toDateString()] || 0,
                isToday: index === 6
            };
        });
    }

    updateDisplay() {
        this.updateTodayCount();
        this.updateCoffeeList();
        this.updateStatistics();
    }

    updateTodayCount() {
        const todaysCoffee = this.getTodaysCoffee();
        document.getElementById('todayCount').textContent = todaysCoffee.length;
    }

    updateCoffeeList() {
        const coffeeList = document.getElementById('coffeeList');
        const todaysCoffee = this.getTodaysCoffee();

        if (todaysCoffee.length === 0) {
            coffeeList.innerHTML = '<p class="empty-message">No coffee recorded today. Add your first cup!</p>';
            return;
        }

        // Sort by time (latest first)
        todaysCoffee.sort((a, b) => {
            const timeA = new Date(`2000/01/01 ${a.time}`);
            const timeB = new Date(`2000/01/01 ${b.time}`);
            return timeB - timeA;
        });

        coffeeList.innerHTML = todaysCoffee.map(coffee => `
            <div class="coffee-item">
                <div class="coffee-meta">
                    <div class="coffee-details">
                        <div class="coffee-type">${coffee.type}</div>
                        <div class="coffee-size">${coffee.size}</div>
                        ${coffee.notes ? `<div class="coffee-notes">"${coffee.notes}"</div>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="coffee-time">${this.formatTime(coffee.time)}</div>
                        <button class="delete-btn" onclick="tracker.deleteCoffee(${coffee.id})" title="Delete this entry">×</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateStatistics() {
        const totalCups = this.coffeeData.length;
        document.getElementById('totalCups').textContent = totalCups;

        // Calculate average per day
        if (totalCups === 0) {
            document.getElementById('avgPerDay').textContent = '0';
            document.getElementById('favoriteType').textContent = '-';
            this.updateWeeklyChart();
            return;
        }

        const dates = [...new Set(this.coffeeData.map(coffee => coffee.date))];
        const avgPerDay = (totalCups / dates.length).toFixed(1);
        document.getElementById('avgPerDay').textContent = avgPerDay;

        // Find favorite coffee type
        const typeCount = {};
        this.coffeeData.forEach(coffee => {
            typeCount[coffee.type] = (typeCount[coffee.type] || 0) + 1;
        });

        const favoriteType = Object.keys(typeCount).reduce((a, b) => 
            typeCount[a] > typeCount[b] ? a : b
        );
        document.getElementById('favoriteType').textContent = favoriteType;
        this.updateWeeklyChart();
    }

    updateWeeklyChart() {
        const weeklyData = this.getLastSevenDaysData();
        const chart = document.getElementById('weeklyChart');
        const peak = document.getElementById('weeklyPeak');
        const MIN_EMPTY_BAR_HEIGHT = 8;
        const MIN_FILLED_BAR_HEIGHT = 18;
        const maxCount = Math.max(...weeklyData.map(day => day.count), 0);
        const peakDays = weeklyData.filter(day => day.count === maxCount && maxCount > 0);

        chart.innerHTML = weeklyData.map(day => {
            const height = maxCount === 0
                ? MIN_EMPTY_BAR_HEIGHT
                : Math.max((day.count / maxCount) * 100, day.count > 0 ? MIN_FILLED_BAR_HEIGHT : MIN_EMPTY_BAR_HEIGHT);

            return `
                <div class="chart-day ${day.isToday ? 'current-day' : ''} ${day.count === maxCount && maxCount > 0 ? 'highest-day' : ''}" role="img" aria-label="${day.fullLabel}: ${day.count} cup${day.count === 1 ? '' : 's'}">
                    <span class="chart-value">${day.count}</span>
                    <div class="chart-bar-track">
                        <div class="chart-bar" style="height: ${height}%;"></div>
                    </div>
                    <span class="chart-label">${day.isToday ? 'Today' : day.label}</span>
                </div>
            `;
        }).join('');

        if (peakDays.length === 0) {
            peak.textContent = 'No coffee logged in the last 7 days yet.';
            return;
        }

        const peakLabels = peakDays.map(day => day.isToday ? 'Today' : day.label);
        peak.textContent = `Peak day${peakLabels.length > 1 ? 's' : ''}: ${peakLabels.join(', ')} - ${maxCount} cup${maxCount === 1 ? '' : 's'}`;
    }

    formatTime(time24) {
        const [hours, minutes] = time24.split(':');
        const hour12 = hours % 12 || 12;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        return `${hour12}:${minutes} ${ampm}`;
    }

    clearForm() {
        document.getElementById('coffeeForm').reset();
    }

    saveData() {
        localStorage.setItem('coffeeData', JSON.stringify(this.coffeeData));
    }

    showNotification(message) {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1000;
            font-family: 'Poppins', sans-serif;
            font-weight: 500;
            animation: slideInRight 0.3s ease;
        `;
        
        // Add CSS animation
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Export data function
    exportData() {
        const dataStr = JSON.stringify(this.coffeeData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'coffee-data.json';
        link.click();
        URL.revokeObjectURL(url);
    }

    // Import data function
    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (Array.isArray(importedData)) {
                    this.coffeeData = importedData;
                    this.saveData();
                    this.updateDisplay();
                    this.showNotification('Data imported successfully!');
                } else {
                    throw new Error('Invalid data format');
                }
            } catch (error) {
                alert('Error importing data. Please make sure the file is valid.');
            }
        };
        reader.readAsText(file);
    }
}

// Initialize the coffee tracker when the page loads
let tracker;

document.addEventListener('DOMContentLoaded', () => {
    tracker = new CoffeeTracker();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to add coffee quickly
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            tracker.showAddForm();
        }
        
        // Escape to close form
        if (e.key === 'Escape') {
            const form = document.getElementById('addCoffeeForm');
            if (form.style.display !== 'none') {
                tracker.hideAddForm();
            }
        }
    });
});

// Add some utility functions for potential future enhancements
const CoffeeUtils = {
    // Calculate caffeine content based on coffee type and size
    estimateCaffeine(type, size) {
        const caffeineMap = {
            'Espresso': { base: 63, multiplier: 1 },
            'Americano': { base: 150, multiplier: 1 },
            'Latte': { base: 150, multiplier: 1 },
            'Cappuccino': { base: 150, multiplier: 1 },
            'Macchiato': { base: 75, multiplier: 1 },
            'Mocha': { base: 95, multiplier: 1 },
            'French Press': { base: 107, multiplier: 1 },
            'Cold Brew': { base: 200, multiplier: 1 },
            'Drip Coffee': { base: 95, multiplier: 1 }
        };

        const sizeMultiplier = {
            'Small': 0.75,
            'Medium': 1,
            'Large': 1.25,
            'Extra Large': 1.5
        };

        const coffee = caffeineMap[type] || { base: 95, multiplier: 1 };
        const sizeM = sizeMultiplier[size] || 1;
        
        return Math.round(coffee.base * coffee.multiplier * sizeM);
    },

    // Get coffee emoji based on type
    getCoffeeEmoji(type) {
        const emojiMap = {
            'Espresso': '☕',
            'Americano': '☕',
            'Latte': '🥛',
            'Cappuccino': '☕',
            'Macchiato': '☕',
            'Mocha': '🍫',
            'French Press': '☕',
            'Cold Brew': '🧊',
            'Drip Coffee': '☕'
        };
        return emojiMap[type] || '☕';
    }
};
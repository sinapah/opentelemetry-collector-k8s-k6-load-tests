import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from scipy.optimize import curve_fit

def exponential_func(x, a, b):
    return a * np.exp(b * x)

df_batch = pd.read_csv('../results/12cpu24gb/five_lpr_result_vus_vs_lpm_1K_queue_1024_batch.csv')
df_non_batch = pd.read_csv('../results/12cpu24gb/five_lpr_result_vus_vs_lpm_1K_queue.csv')

# Plot 1: Log Lines / Minute vs Average VUs
fig1, ax1 = plt.subplots(figsize=(10, 6))

def plot_vus_vs_lpm(ax, df, label, color, degree=1):
    log_lines = df['Log Lines / Minute'].values
    avg_vus = df['Average # of VUs'].values
    max_vus = df['Max # of VUs'].values

    # Plotting the points
    for i in range(len(df)):
        x = log_lines[i]
        y = avg_vus[i]
        ax.plot(x, y, 'o', color=color, markersize=5)

        # Add label for max VUs
        offset_x = 2500
        offset_y = 1
        ax.text(x + offset_x, y + offset_y,"", fontsize=8, color=color, alpha=0.8)

    # Linear fit line with np.polyfit()
    try:
        if degree == 1:
            coeffs = np.polyfit(log_lines, avg_vus, 1)  # Linear fit
            y_fit = np.polyval(coeffs, log_lines)      # Values of the fit line
            ax.plot(log_lines, y_fit, color=color, linestyle='--', label=f'{label} Fit')
        else:
            x_scaled = log_lines / 100000
            params, _ = curve_fit(exponential_func, x_scaled, avg_vus, maxfev=10000)
            x_fit = np.linspace(min(log_lines), max(log_lines), 500)
            y_fit = exponential_func(x_fit / 100000, *params)
            ax.plot(x_fit, y_fit, color=color, linestyle='--')
    except Exception as e:
        print(f"Could not fit curve for {label}: {e}")

    # Set axis limits, ensuring y=0 points aren't cut off
    ax.set_xlim(0, max(log_lines) * 1.1)
    ax.set_ylim(0, max(avg_vus) * 1.1)  # Ensure y=0 is included in the range

    # Labels and grid
    ax.set_xlabel('Log Lines / Minute')
    ax.set_ylabel('Average VUs')
    ax.grid(which='major', linestyle='-', linewidth=0.75)
    ax.grid(which='minor', linestyle='--', linewidth=0.5)
    ax.minorticks_on()
    ax.legend(fontsize=8)

# Plot for batch data
plot_vus_vs_lpm(ax1, df_batch, "Queue of 1K, Batch of 1K", color='blue')

# Plot for non-batch data
plot_vus_vs_lpm(ax1, df_non_batch, "Queue of 1K, No Batch", color='green', degree=2)

fig1.suptitle('Average VUs vs Log Lines Per Minute', fontsize=14)
fig1.tight_layout(rect=[0, 0, 1, 0.93])
plt.savefig('avg_vus_vs_lpm_batch_vs_no_batch.png') 
plt.show()

# Plot 2: Log Lines / Minute vs Error Rate
fig2, ax2 = plt.subplots(figsize=(10, 6))

def plot_error_rate_vs_lpm(ax, df, label, color):
    log_lines = df['Log Lines / Minute'].values
    error_rate = df['Failed HTTP Request Error %'].values

    # Plotting the error rate points
    ax.plot(log_lines, error_rate, 'o', color=color, markersize=5, label=label)

    # Set axis limits
    ax.set_xlim(0, max(log_lines) * 1.1)
    ax.set_ylim(0, 100)  # Assuming error rate is percentage

    coeffs = np.polyfit(log_lines, error_rate, 1)  # Linear fit
    y_fit = np.polyval(coeffs, log_lines)      # Values of the fit line
    ax.plot(log_lines, y_fit, color=color, linestyle='--')

    # Labels and grid
    ax.set_xlabel('Log Lines / Minute')
    ax.set_ylabel('Percentage of Error Responses (All Are 503)')
    ax.grid(which='major', linestyle='-', linewidth=0.75)
    ax.grid(which='minor', linestyle='--', linewidth=0.5)
    ax.minorticks_on()
    ax.legend(fontsize=8)

# Plot for batch data
plot_error_rate_vs_lpm(ax2, df_batch, "Queue of 1K, Batch of 1K", color='blue')

# Plot for non-batch data
plot_error_rate_vs_lpm(ax2, df_non_batch, "Queue of 1K, No Batch", color='green')

fig2.suptitle('Error Rate vs Log Lines Per Minute', fontsize=14)
fig2.tight_layout(rect=[0, 0, 1, 0.93])
plt.savefig('error_rate_vs_lpm_batch_vs_no_batch.png')
plt.show()

fig3, ax3 = plt.subplots(figsize=(10, 6))


def plot_cpu_use_vs_lpm(ax, df, label, color):
    log_lines = df['Log Lines / Minute'].values
    cpu_use = df['Otel Under Test Average CPU Use (m-cores)'].values
    ax.plot(log_lines, cpu_use, 'o', color=color, markersize=5, label=label)

    # Set axis limits
    ax.set_xlim(0, max(log_lines) * 1.1)
    ax.set_ylim(0, 2000)  # Assuming error rate is percentage

    coeffs = np.polyfit(log_lines, cpu_use, 1)  # Linear fit
    y_fit = np.polyval(coeffs, log_lines)      # Values of the fit line
    ax.plot(log_lines, y_fit, color=color, linestyle='--')

    # Labels and grid
    ax.set_xlabel('Log Lines / Minute')
    ax.set_ylabel('CPU Use (millicores)')
    ax.grid(which='major', linestyle='-', linewidth=0.75)
    ax.grid(which='minor', linestyle='--', linewidth=0.5)
    ax.minorticks_on()
    ax.legend(fontsize=8)

# Plot for batch data
plot_cpu_use_vs_lpm(ax3, df_batch, "Queue of 1K, Batch of 1K", color='blue')

# Plot for non-batch data
plot_cpu_use_vs_lpm(ax3, df_non_batch, "Queue of 1K, No Batch", color='green')

fig3.suptitle('CPU Use vs Log Lines Per Minute', fontsize=14)
fig3.tight_layout(rect=[0, 0, 1, 0.93])
plt.savefig('cpu_vs_lpm_batch_vs_no_batch.png')
plt.show()

fig4, ax4 = plt.subplots(figsize=(10, 6))


def plot_memory_use_vs_lpm(ax, df, label, color):
    log_lines = df['Log Lines / Minute'].values
    mem_use = df['Otel Under Test Average Memory Use (MiB)'].values
    ax.plot(log_lines, mem_use, 'o', color=color, markersize=5, label=label)

    # Set axis limits
    ax.set_xlim(0, max(log_lines) * 1.1)
    ax.set_ylim(0, 1000)  # Assuming error rate is percentage

    coeffs = np.polyfit(log_lines, mem_use, 1)  # Linear fit
    y_fit = np.polyval(coeffs, log_lines)      # Values of the fit line
    ax.plot(log_lines, y_fit, color=color, linestyle='--')

    # Labels and grid
    ax.set_xlabel('Log Lines / Minute')
    ax.set_ylabel('Memory Use (MiB)')
    ax.grid(which='major', linestyle='-', linewidth=0.75)
    ax.grid(which='minor', linestyle='--', linewidth=0.5)
    ax.minorticks_on()
    ax.legend(fontsize=8)

# Plot for batch data
plot_memory_use_vs_lpm(ax4, df_batch, "Queue of 1K, Batch of 1K", color='blue')

# Plot for non-batch data
plot_memory_use_vs_lpm(ax4, df_non_batch, "Queue of 1K, No Batch", color='green')

fig4.suptitle('Memory Use vs Log Lines Per Minute', fontsize=14)
fig4.tight_layout(rect=[0, 0, 1, 0.93])
plt.savefig('memory_vs_lpm_batch_vs_no_batch.png')
plt.show()


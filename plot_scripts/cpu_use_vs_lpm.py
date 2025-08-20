import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

df1 = pd.read_csv('../results/12cpu24gb/five_lpr_result_vus_vs_lpm_1_queue.csv')  
df2 = pd.read_csv('../results/12cpu24gb/five_lpr_result_vus_vs_lpm_1K_queue.csv')  
df3 = pd.read_csv('../results/12cpu24gb/five_lpr_result_vus_vs_lpm_10K_queue.csv')   

fig, axes = plt.subplots(1, 3, figsize=(18, 5), sharey=True)

def plot_dataframe(ax, df, queue_label, color, marker_style='o'):
    log_lines = df['Log Lines / Minute'].values
    error_rate = df['Failed HTTP Request Error %'].values
    p99 = df['P(99) (ms)'].values
    cpu_use = df['Otel Under Test Average CPU Use (m-cores)'].values
    passed_marker = {'marker': 'o', 'color': 'gray', 'linestyle': 'None'}

    plotted_passed = False
    plotted_failed = False

    for i in range(len(df)):
        x = log_lines[i]
        y = cpu_use[i]
        latency = p99[i]
        error = error_rate[i]

        point_color = color

        ax.plot(x, y, marker_style, color=point_color, markersize=5)

        label = ""
        offset_x = 2500
        offset_y = 3
        ax.text(x + offset_x, y + offset_y, label, fontsize=8, color=color, alpha=0.8)

    try:
        coeffs = np.polyfit(log_lines, cpu_use, 1)
        y_fit = np.polyval(coeffs, log_lines)
        ax.plot(log_lines, y_fit, color=color, linestyle='--')
    except Exception:
        print(f"Could not fit linear curve for {queue_label}")

    ax.set_xlim(0, 525000)
    ax.set_ylim(-1, 100)
    ax.set_xlabel('Log Lines / Minute')
    ax.grid(which='major', linestyle='-', linewidth=0.75)
    ax.grid(which='minor', linestyle='--', linewidth=0.5)
    ax.minorticks_on()

    xticks = ax.get_xticks()
    ax.set_xticks(xticks)
    ax.set_xticklabels([f"{int(x/1000)}k" for x in xticks])

    yticks = np.arange(0, 2200, 200)
    ax.set_yticks(yticks)
    ax.set_yticklabels([str(y) for y in yticks])

    ax.text(0.02, 0.95, queue_label, transform=ax.transAxes,
            fontsize=10, fontweight='bold', verticalalignment='top', horizontalalignment='left')

    ax.legend(fontsize=8, loc='upper right')

plot_dataframe(axes[0], df1, "Queue Capacity: 1", color='blue')
plot_dataframe(axes[1], df2, "Queue Capacity: 1,000", color='green')
plot_dataframe(axes[2], df3, "Queue Capacity: 10,000", color='orange')

axes[0].set_ylabel('CPU Use (m-cores)')

fig.suptitle('CPU Use of Otelcol VS Log Lines Per Minute', fontsize=14)
fig.tight_layout(rect=[0, 0, 1, 0.93])

plt.savefig('../plots/cpu_use_vs_lpm_subplots.png')
plt.show()

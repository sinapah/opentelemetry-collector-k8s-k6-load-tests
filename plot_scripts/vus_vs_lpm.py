import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

df1 = pd.read_csv('../results/12cpu24gb/five_lpr_result_vus_vs_lpm_1_queue.csv')  
df2 = pd.read_csv('../results/12cpu24gb/five_lpr_result_vus_vs_lpm_1K_queue.csv')  
df3 = pd.read_csv('../results/12cpu24gb/five_lpr_result_vus_vs_lpm_10K_queue.csv')   

fig, axs = plt.subplots(1, 3, figsize=(18, 6))

def plot_dataframe(ax, df, label_prefix, color, marker_style='o', degree=2):
    log_lines = df['Log Lines / Minute']
    avg_vus = df['Average # of VUs']
    error_rate = df['Failed HTTP Request Error %']
    p99 = df['P(99) (ms)']
    max_vus = df['Max # of VUs']
    avg_queue = df['Average Queue Size']
    max_queue = df['Max Queue Size']
    jitter_strength = 0.08

    for i in range(len(df)):
        x = log_lines[i]
        y = avg_vus[i]
        latency = p99[i]
        error = error_rate[i]
        
        marker = 'x' if error > 1 else marker_style
        color = color if latency < 100 else 'red'

        jitter_x = x + np.random.uniform(-jitter_strength, jitter_strength)  
        jitter_y = y + np.random.uniform(-jitter_strength, jitter_strength)
        ax.plot(jitter_x, jitter_y, marker, color=color, markersize=5, label=label_prefix if i == 0 else "")
        
        label = ""

        ax.text(x+0.25, y+0.25, label, fontsize=8, color=color, alpha=0.8)

    p = np.polyfit(log_lines, avg_vus, degree)
    fit_line = np.polyval(p, log_lines)  
    ax.plot(log_lines, fit_line, color=color, linestyle='--')

plot_dataframe(axs[0], df1, "Using Sending Queue Capacity = 1", color='blue', degree=1)  
plot_dataframe(axs[1], df2, "Using Sending Queue Capacity = 1,000", color='green')  
plot_dataframe(axs[2], df3, "Using Sending Queue Capacity = 10,000", color='orange') 

axs[0].set_xlabel('Log Lines / Minute')
axs[0].set_ylabel('Average # of VUs')
axs[0].set_title('Average # of VUs vs Log Lines / Minute')

axs[1].set_xlabel('Log Lines / Minute')
axs[1].set_title('Average # of VUs vs Log Lines / Minute')

axs[2].set_xlabel('Log Lines / Minute')
axs[2].set_title('Average # of VUs vs Log Lines / Minute')

for ax in axs:
    ax.set_xlim(0, 550000)
    ax.set_ylim(0, 300)
    ax.set_xticks(np.arange(0, 500001, 100000))
    locs, labels_ = ax.get_xticks(), ax.get_xticklabels()
    ax.set_xticklabels([f"{x/1000:.0f}k" for x in locs])

plt.plot([], [], 'o', color='blue', label='Passed (Error % < 1)')
plt.plot([], [], 'x', color='red', label='Failed (Error % < 1)')
plt.legend(fontsize=8)

for ax in axs:
    ax.minorticks_on()
    ax.grid(which='major', linestyle='-', linewidth=0.75)
    ax.grid(which='minor', linestyle='--', linewidth=0.5)

plt.savefig('../plots/average_vus_vs_lpm_subplots.png')
plt.show()

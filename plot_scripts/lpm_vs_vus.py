import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

df1 = pd.read_csv('results/4cpu8gb/five_lpr_results.csv')
df2 = pd.read_csv('results/12cpu24gb/five_lpr_results.csv')
#df3 = pd.read_csv('ten_lpr_results.csv')

plt.figure(figsize=(10, 6))

colors = ['black', 'blue', 'red']
labels = ['5 logs per request on 4cpu8gb', '5 logs per request on 12cpu24gb']
datasets = [df1, df2]

all_log_lines = []

for idx, df in enumerate(datasets):
    vus = df['# of VUs']
    log_lines = df['Log Lines / Minute']
    p99 = df['P(99) (ms)']

    all_log_lines.extend(log_lines.tolist())

    color = colors[idx]
    label_prefix = labels[idx]

    for i in range(len(df)):
        vu = vus[i]
        logs = log_lines[i]
        latency = p99[i]
        passed = latency < 100
        marker = 'o' if passed else 'x'
        plt.plot(vu, logs, marker, color=color)
        offset_x = 1
        offset_y = 5000
        plt.text(vu + offset_x, logs + offset_y, f"{latency:.0f} ms",
                 fontsize=8, color=color, alpha=0.8)

    if idx == 0:
        plt.plot([], [], 'o', color=color,
                 label=f'{label_prefix} - passed P(99) < 100 ms threshold (4)')
        plt.plot([], [], 'x', color=color,
                 label=f'{label_prefix} - failed P(99) < 100 ms threshold (4)')
    else:
        plt.plot([], [], 'o', color=color,
                 label=f'{label_prefix} - passed P(99) < 100 ms threshold (4)')
        plt.plot([], [], 'x', color=color,
                 label=f'{label_prefix} - failed P(99) < 100 ms threshold (4)')

    mask_lt_100 = p99 < 100

    if any(mask_lt_100):
        coeffs = np.polyfit(vus[mask_lt_100], log_lines[mask_lt_100], deg=1)
        fit_fn = np.poly1d(coeffs)

        
        x_min_line = min(vus[mask_lt_100])
        x_max_line = 200
        x_vals = np.linspace(x_min_line, x_max_line, 100)
        

        plt.plot(x_vals, fit_fn(x_vals), '--', color=color, alpha=0.7)

y_max = max(all_log_lines)
plt.ylim(0, y_max + 500000)

locs, labels_ = plt.yticks()
plt.yticks(locs, [f"{y/100000:.1f}" for y in locs])

plt.xlabel('# of VUs')
plt.ylabel('100,000 Log Lines / Minute')
plt.title('Log Lines vs # of VUs When Using Constant VUs Executor')
plt.plot([], [], ' ', label='All tests were conducted for 10 minutes')
plt.plot([], [], ' ', label='The Otelcol charm was constrained to 2cpu4gb')
plt.plot([], [], ' ', label='Log requests were sent to Otelcol over HTTP using OTLP with JSON encoding')
plt.legend(fontsize=8)
plt.minorticks_on()

plt.grid(which='major', linestyle='-', linewidth=0.75)
plt.grid(which='minor', linestyle='--', linewidth=0.5)

plt.savefig('vus_plot_combined.png')
plt.show()

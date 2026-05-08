import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import re

# The SQL data provided in your prompt
sql_data = """ 
[Insert SQL text here] 
"""

# Extract all start and end times using regex
matches = re.findall(r"'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+00)',\s*'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+00)'", sql_data)

df = pd.DataFrame(matches, columns=['start', 'end'])
df['start'] = pd.to_datetime(df['start'])
df['end'] = pd.to_datetime(df['end'])

# Initialize heatmap grid (24 hours x 7 days)
heatmap_data = pd.DataFrame(0.0, index=range(24), columns=['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
days_map = {0: 'Mon', 1: 'Tue', 2: 'Wed', 3: 'Thu', 4: 'Fri', 5: 'Sat', 6: 'Sun'}

# Accumulate minutes studied per hour block
for _, row in df.iterrows():
    start = row['start']
    end = row['end']
    
    # Calculate minute-by-minute range to easily bucket into hour/day
    dr = pd.date_range(start, end, freq='1min')[:-1] # Exclude exact end minute to prevent overlap
    if len(dr) == 0:
        dr = [start] # Add at least 1 minute for very short sessions
        
    for t in dr:
        day_idx = t.weekday()
        hour = t.hour
        heatmap_data.loc[hour, days_map[day_idx]] += 1

# Plotting the heatmap
plt.figure(figsize=(12, 8))
sns.set_theme(style="whitegrid")
ax = sns.heatmap(heatmap_data, cmap="YlOrRd", annot=False, fmt=".0f", linewidths=.5, cbar_kws={'label': 'Minutes Studied'})

plt.title("Study Schedule Heatmap (Minutes per Hour)", fontsize=16, pad=15)
plt.xlabel("Day of the Week", fontsize=12)
plt.ylabel("Hour of the Day", fontsize=12)

# Format y-ticks to show standard 12-hour time
ylabels = ["12 AM" if h == 0 else f"{h} AM" if h < 12 else "12 PM" if h == 12 else f"{h-12} PM" for h in range(24)]
ax.set_yticklabels(ylabels, rotation=0)

plt.tight_layout()
plt.show()
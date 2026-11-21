
import kagglehub
import pandas as pd
import os

# Download the finalized dataset
path = kagglehub.dataset_download(
    "lainguyn123/student-performance-factors"
)

csv_path = os.path.join(path, "StudentPerformanceFactors.csv")
df = pd.read_csv(csv_path)

print("Dataset Shape:", df.shape)
print("\nColumn Names:")
print(df.columns.tolist())

# Check categorical columns
categorical_columns = df.select_dtypes(
    include=["object"]
).columns

print("\n========== CATEGORICAL VALUES ==========")

for column in categorical_columns:
    print(f"\n{column}:")
    print(sorted(df[column].dropna().unique().tolist()))

# Check numerical ranges
numerical_columns = df.select_dtypes(
    include=["number"]
).columns

print("\n========== NUMERICAL RANGES ==========")

for column in numerical_columns:
    print(f"\n{column}")
    print("Minimum:", df[column].min())
    print("Maximum:", df[column].max())

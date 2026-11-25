# What is a digit worth in this column?

Grade 4 · Place value, rounding and column arithmetic

<a name="g41--reading-the-places"></a>

## Reading the places

[4.NBT.A.1](https://www.thecorestandards.org/Math/Content/4/NBT/A/1/), [4.NBT.A.2](https://www.thecorestandards.org/Math/Content/4/NBT/A/2/), [4.NBT.A.3](https://www.thecorestandards.org/Math/Content/4/NBT/A/3/)

The place table here runs from ones to one million, the upper limit for these whole-number examples. In **770**, the left 7 counts hundreds and the next 7 counts tens. Seven bundles of ten tens make 70 tens, or 700. Thus 700 = 10 × 70. Each step left changes the size of the unit by this same factor.

| Numeral | Read aloud | Expanded by place |
|---|---|---|
| 770 | seven hundred seventy | 700 + 70 |
| 704,009 | seven hundred four thousand nine | 700,000 + 4,000 + 9 |
| 704,090 | seven hundred four thousand ninety | 700,000 + 4,000 + 90 |
| 1,000,000 | one million | 1 × 1,000,000 |

Rebuild from the right. Nine ones, zero tens, zero hundreds, four thousands, zero ten-thousands and seven hundred-thousands gives 704,009. Keep the other digits fixed, but move the **digit 9** from the ones place to the tens place. It now represents 90 rather than 9, so the numeral becomes **704,090**. This changes the value; it is not a regrouping of the same objects. For 770 the ones column is empty. For one million all six places below millions are empty.

Compare from the left. The first four digits agree in 704,009 and 704,090. At tens, 0 < 9, so **704,009 < 704,090** and **704,090 > 704,009**. Matching every place gives **704,009 = 700,000 + 4,000 + 9**.

### Nearest multiple

Rounding chooses the nearest multiple of the requested unit. At an exact halfway point choose the larger multiple.

| Number | Unit | Bounding multiples | Distances in order | Rounded result |
|---:|---:|---|---|---:|
| 704,009 | 1 | already a multiple, neighbors 704,008 and 704,010 | 0 to itself | 704,009 |
| 770 | 10 | already a multiple, neighbors 760 and 780 | 0 to itself | 770 |
| 749 | 100 | 700 and 800 | 49 and 51 | 700 |
| 750 | 100 | 700 and 800 | 50 and 50 | 800 |
| 751 | 100 | 700 and 800 | 51 and 49 | 800 |
| 999,600 | 1,000 | 999,000 and 1,000,000 | 600 and 400 | 1,000,000 |
| 704,009 | 10,000 | 700,000 and 710,000 | 4,009 and 5,991 | 700,000 |
| 704,090 | 100,000 | 700,000 and 800,000 | 4,090 and 95,910 | 700,000 |
| 770 | 1,000,000 | 0 and 1,000,000 | 770 and 999,230 | 0 |

Check the two distances in each between-multiples row. Together they span exactly one rounding unit. At 999,600 the nearer endpoint carries through the thousands into the millions place.

**Parent bridge.** Read 770 as 7 hundreds and 7 tens. Unbundle one hundred into ten tens and the two 7s acquire a common counting unit.

<a name="g42--following-each-exchange"></a>

## Following each exchange

[4.NBT.B.4](https://www.thecorestandards.org/Math/Content/4/NBT/B/4/)

Add 59,986 and 78. Align ones under ones. Work from the right, writing the digit kept in each column and carrying the exchanged unit one column left.

```text
  59986
+    78
-------
  60064
```

| Column | Incoming calculation | Write here | Trade for the next place |
|---|---|---|---|
| Ones | 6 + 8 = 14 ones | 4 ones | 10 ones = 1 ten |
| Tens | 8 + 7 + 1 = 16 tens | 6 tens | 10 tens = 1 hundred |
| Hundreds | 9 + 1 = 10 hundreds | 0 hundreds | 10 hundreds = 1 thousand |
| Thousands | 9 + 1 = 10 thousands | 0 thousands | 10 thousands = 1 ten-thousand |
| Ten-thousands | 5 + 1 = 6 ten-thousands | 6 ten-thousands | finished |

Check the values moved, in ones: 10 × 1 = 10, 10 × 10 = 100, 10 × 100 = 1,000 and 10 × 1,000 = 10,000. Independently split 78 into 14 + 64. The first 14 brings 59,986 to 60,000, so the sum is **60,064**.

Now take 487 from 50,002. Two ones cannot supply seven ones. The nearest available bundle is a ten-thousand.

```text
  50002
-   487
-------
  49515
```

| Trade in order | Ten-thousands | Thousands | Hundreds | Tens | Ones | Check in ones |
|---|---:|---:|---:|---:|---:|---|
| Start | 5 | 0 | 0 | 0 | 2 | 50,000 + 2 |
| Open a ten-thousand | 4 | 10 | 0 | 0 | 2 | 40,000 + 10,000 + 2 |
| Open a thousand | 4 | 9 | 10 | 0 | 2 | 40,000 + 9,000 + 1,000 + 2 |
| Open a hundred | 4 | 9 | 9 | 10 | 2 | 40,000 + 9,000 + 900 + 100 + 2 |
| Open a ten | 4 | 9 | 9 | 9 | 12 | 40,000 + 9,000 + 900 + 90 + 12 |

Every row still represents 50,002. Subtract right to left: 12 − 7 = 5, 9 − 8 = 1, 9 − 4 = 5, 9 − 0 = 9, 4 − 0 = 4. The difference is **49,515**. Add back 400, then 80, then 7: 49,915 → 49,995 → 50,002.

**Parent bridge.** Follow the opened bundle through the zeros. Each middle column receives ten units and passes one of them to the next column, leaving nine. [Earlier place-value trades](../grade-2/place-value-trades.md)

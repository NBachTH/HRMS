-- Phase 3.3: Public holiday calendar
CREATE TABLE public_holiday
(
    id               VARCHAR(64)  NOT NULL,
    holiday_year     INTEGER      NOT NULL,
    holiday_date     DATE         NOT NULL,
    name             VARCHAR(200) NOT NULL,
    compensatory_day BOOLEAN      NOT NULL DEFAULT false,
    CONSTRAINT public_holiday_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_public_holiday_date ON public_holiday (holiday_date);
CREATE INDEX idx_public_holiday_year ON public_holiday (holiday_year);

-- Seed: Vietnamese public holidays for 2026
INSERT INTO public_holiday (id, holiday_year, holiday_date, name, compensatory_day) VALUES
('ph-2026-01', 2026, '2026-01-01', 'Tết Dương Lịch (New Year)', false),
('ph-2026-02', 2026, '2026-01-28', 'Tết Nguyên Đán (Lunar New Year - Day 1)', false),
('ph-2026-03', 2026, '2026-01-29', 'Tết Nguyên Đán (Lunar New Year - Day 2)', false),
('ph-2026-04', 2026, '2026-01-30', 'Tết Nguyên Đán (Lunar New Year - Day 3)', false),
('ph-2026-05', 2026, '2026-01-31', 'Tết Nguyên Đán (Lunar New Year - Day 4)', false),
('ph-2026-06', 2026, '2026-02-01', 'Tết Nguyên Đán (Lunar New Year - Day 5)', false),
('ph-2026-07', 2026, '2026-04-07', 'Giỗ Tổ Hùng Vương (Hung Kings Festival)', false),
('ph-2026-08', 2026, '2026-04-30', 'Ngày Giải Phóng Miền Nam (Liberation Day)', false),
('ph-2026-09', 2026, '2026-05-01', 'Ngày Quốc Tế Lao Động (International Labour Day)', false),
('ph-2026-10', 2026, '2026-09-02', 'Ngày Quốc Khánh (National Day)', false),
('ph-2026-11', 2026, '2026-09-03', 'Ngày Quốc Khánh (National Day - extra)', false);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pendiente', 'Acreditado', 'Entregado')),
  client TEXT NOT NULL,
  salesperson TEXT NOT NULL,
  "order" TEXT NOT NULL,
  trade_in TEXT,
  gross_profit NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  storage TEXT NOT NULL,
  color TEXT,
  battery_health TEXT,
  imei TEXT,
  cost_price NUMERIC NOT NULL,
  sale_price NUMERIC NOT NULL,
  provider TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create providers table
CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create account transactions table (for both clients and providers)
CREATE TABLE IF NOT EXISTS account_transactions (
  id TEXT PRIMARY KEY,
  account_type TEXT NOT NULL CHECK (account_type IN ('client', 'provider')),
  account_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sale', 'payment', 'debt', 'manual_debt')),
  amount NUMERIC NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  sale_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cash transactions table
CREATE TABLE IF NOT EXISTS cash_transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  expense_type TEXT CHECK (expense_type IN ('operational', 'stock_payment', 'withdrawal')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pending orders table
CREATE TABLE IF NOT EXISTS pending_orders (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  products JSONB NOT NULL,
  total_cost NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'received')),
  order_date TEXT NOT NULL,
  received_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_client ON sales(client);
CREATE INDEX IF NOT EXISTS idx_inventory_model ON inventory(model);
CREATE INDEX IF NOT EXISTS idx_inventory_provider ON inventory(provider);
CREATE INDEX IF NOT EXISTS idx_account_transactions_account ON account_transactions(account_type, account_name);
CREATE INDEX IF NOT EXISTS idx_account_transactions_date ON account_transactions(date);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_date ON cash_transactions(date);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_type ON cash_transactions(type);
CREATE INDEX IF NOT EXISTS idx_pending_orders_status ON pending_orders(status);
CREATE INDEX IF NOT EXISTS idx_pending_orders_provider ON pending_orders(provider);

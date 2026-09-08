import { FormEvent, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { ArrowRight, Instagram, LogOut, Menu, Minus, Plus, ShoppingBag, X } from 'lucide-react'
import { supabase } from './supabase'
import type { CartItem, Product } from './types'
import './styles.css'

const money = (value: number | null | undefined) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value || 0)

const stockLabel = (stock: number | null | undefined) => {
  if (!stock || stock <= 0) return 'AGOTADO'
  if (stock === 1) return 'ÚLTIMO'
  return 'DISPONIBLE'
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark ${compact ? 'compact' : ''}`} aria-label="El Mate del 10">
      <span>EL MATE DEL</span><strong>10</strong>
    </div>
  )
}

function Layout({ children, cartCount, onOpenCart }: { children: React.ReactNode, cartCount: number, onOpenCart: () => void }) {
  const [menu, setMenu] = useState(false)
  return (
    <>
      <header className="topbar">
        <a href="/" className="logo-link"><BrandMark compact /></a>
        <nav className={menu ? 'nav open' : 'nav'}>
          <a href="/#catalogo" onClick={() => setMenu(false)}>Catálogo</a>
          <a href="/#nuevos" onClick={() => setMenu(false)}>Recién convocados</a>
          <button className="cart-nav" onClick={() => { onOpenCart(); setMenu(false) }}>
            Mi pedido <span>{cartCount}</span>
          </button>
        </nav>
        <button className="menu-btn" onClick={() => setMenu(v => !v)} aria-label="Menú">
          {menu ? <X /> : <Menu />}
        </button>
      </header>
      {children}
    </>
  )
}

function ProductCard({ product, onAdd }: { product: Product, onAdd: (p: Product) => void }) {
  const cover = product.product_images?.slice().sort((a,b) => Number(b.is_cover) - Number(a.is_cover) || a.position - b.position)[0]?.image_url
  const soldOut = !product.stock || product.stock <= 0
  return (
    <article className="product-card">
      <div className="product-image">
        {cover ? <img src={cover} alt={product.name || 'Producto'} /> : <div className="image-placeholder">10</div>}
        {product.is_new && <span className="tag new">NUEVO</span>}
        <span className={`tag stock ${soldOut ? 'sold' : ''}`}>{stockLabel(product.stock)}</span>
      </div>
      <div className="product-info">
        <div>
          <p className="eyebrow">{product.model || product.category || 'El Mate del 10'}</p>
          <h3>{product.name || 'Producto'}</h3>
        </div>
        <strong className="price">{money(product.price)}</strong>
        <button className="add-btn" disabled={soldOut} onClick={() => onAdd(product)}>
          {soldOut ? 'AGOTADO' : '+ AGREGAR AL PEDIDO'}
        </button>
      </div>
    </article>
  )
}

function CartDrawer({ open, items, onClose, onChange }: {
  open: boolean
  items: CartItem[]
  onClose: () => void
  onChange: (id: number, delta: number) => void
}) {
  const total = items.reduce((s, i) => s + (i.product.price || 0) * i.quantity, 0)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')

  const whatsapp = () => {
    const number = import.meta.env.VITE_WHATSAPP_NUMBER
    if (!number) {
      alert('Falta configurar el número de WhatsApp.')
      return
    }
    const lines = items.map(i => `• ${i.quantity} x ${i.product.name} — ${money((i.product.price || 0) * i.quantity)}`)
    const text = [
      'Hola! Quiero consultar por este pedido de El Mate del 10:',
      '',
      ...lines,
      '',
      `Total de referencia: ${money(total)}`,
      name ? `Nombre: ${name}` : '',
      location ? `Localidad/Provincia: ${location}` : '',
    ].filter(Boolean).join('\n')
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <>
      <div className={`drawer-overlay ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`cart-drawer ${open ? 'show' : ''}`}>
        <div className="drawer-head">
          <div><p className="eyebrow">MI PEDIDO</p><h2>Los convocados</h2></div>
          <button onClick={onClose}><X /></button>
        </div>
        <div className="cart-list">
          {items.length === 0 && <div className="empty-cart"><ShoppingBag size={36}/><p>Todavía no convocaste ningún producto.</p></div>}
          {items.map(item => (
            <div className="cart-item" key={item.product.id}>
              <div>
                <strong>{item.product.name}</strong>
                <small>{money(item.product.price)}</small>
              </div>
              <div className="qty">
                <button onClick={() => onChange(item.product.id, -1)}><Minus size={16}/></button>
                <span>{item.quantity}</span>
                <button onClick={() => onChange(item.product.id, 1)}><Plus size={16}/></button>
              </div>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="cart-bottom">
            <div className="total"><span>TOTAL</span><strong>{money(total)}</strong></div>
            <input placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} />
            <input placeholder="Localidad / Provincia" value={location} onChange={e => setLocation(e.target.value)} />
            <button className="whatsapp-btn" onClick={whatsapp}>CONTINUAR POR WHATSAPP <ArrowRight size={18}/></button>
            <p className="microcopy">El pedido se confirma por WhatsApp. Agregar productos no reserva stock.</p>
          </div>
        )}
      </aside>
    </>
  )
}

function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('Todos')
  const [cart, setCart] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('emd10-cart') || '[]') } catch { return [] }
  })
  const [cartOpen, setCartOpen] = useState(false)
  const [flash, setFlash] = useState('')

  useEffect(() => {
    supabase
      .from('products')
      .select('*, product_images(*), product_features(*)')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        setProducts((data || []) as Product[])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    localStorage.setItem('emd10-cart', JSON.stringify(cart))
  }, [cart])

  const add = (p: Product) => {
    setCart(prev => {
      const found = prev.find(i => i.product.id === p.id)
      if (found) return prev.map(i => i.product.id === p.id ? {...i, quantity: Math.min(i.quantity + 1, p.stock || 1)} : i)
      return [...prev, { product: p, quantity: 1 }]
    })
    setFlash('✓ CONVOCADO')
    setTimeout(() => setFlash(''), 1200)
  }

  const change = (id: number, delta: number) => {
    setCart(prev => prev
      .map(i => i.product.id === id ? {...i, quantity: Math.max(0, Math.min(i.quantity + delta, i.product.stock || 1))} : i)
      .filter(i => i.quantity > 0))
  }

  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[]))]
  const filtered = category === 'Todos' ? products : products.filter(p => p.category === category)
  const featured = products.filter(p => p.is_featured).slice(0, 4)
  const newOnes = products.filter(p => p.is_new).slice(0, 4)
  const cartCount = cart.reduce((s,i) => s + i.quantity, 0)

  return (
    <Layout cartCount={cartCount} onOpenCart={() => setCartOpen(true)}>
      {flash && <div className="flash">{flash}</div>}
      <main>
        <section className="hero">
          <div className="diamonds" aria-hidden="true">◆ ◆ ◆</div>
          <div className="hero-copy">
            <p className="eyebrow invert">LOS CONVOCADOS</p>
            <h1>LO QUE ESTÁ<br/>JUGANDO HOY.</h1>
            <p>Mates, bombillas, materas y accesorios. Producto real, stock real.</p>
            <a className="hero-cta" href="#catalogo">VER CATÁLOGO <ArrowRight /></a>
          </div>
          <div className="hero-ten" aria-hidden="true">10</div>
        </section>

        {featured.length > 0 && (
          <section className="section">
            <div className="section-title"><p className="eyebrow">SELECCIÓN</p><h2>TITULARES</h2></div>
            <div className="grid">
              {featured.map(p => <ProductCard key={p.id} product={p} onAdd={add}/>)}
            </div>
          </section>
        )}

        <section className="brand-break">
          <div className="brand-break-ten">10</div>
          <div><p className="eyebrow invert">EL MATE DEL 10</p><h2>EL QUE ESTÁ<br/>EN TODAS.</h2></div>
          <div className="rombos">◆ ◆ ◆ ◆ ◆</div>
        </section>

        <section className="section" id="catalogo">
          <div className="section-title"><p className="eyebrow">CATÁLOGO</p><h2>LOS CONVOCADOS</h2></div>
          <div className="filters">
            {categories.map(c => <button key={c} className={c === category ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}
          </div>
          {loading ? <p>Cargando catálogo...</p> : (
            <div className="grid">
              {filtered.map(p => <ProductCard key={p.id} product={p} onAdd={add}/>)}
            </div>
          )}
        </section>

        {newOnes.length > 0 && (
          <section className="section section-blue" id="nuevos">
            <div className="section-title"><p className="eyebrow invert">NOVEDADES</p><h2>RECIÉN CONVOCADOS</h2></div>
            <div className="grid">
              {newOnes.map(p => <ProductCard key={p.id} product={p} onAdd={add}/>)}
            </div>
          </section>
        )}
      </main>

      <footer>
        <BrandMark />
        <p>EL QUE ESTÁ EN TODAS.</p>
        <div className="footer-links">
          <a href={import.meta.env.VITE_INSTAGRAM_URL || 'https://instagram.com/matedel10'} target="_blank" rel="noreferrer"><Instagram size={18}/> Instagram</a>
          <a href="/admin">Admin</a>
        </div>
      </footer>

      <CartDrawer open={cartOpen} items={cart} onClose={() => setCartOpen(false)} onChange={change}/>
    </Layout>
  )
}

function Admin() {
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [editing, setEditing] = useState<Product | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('products').select('*, product_images(*)').order('created_at', { ascending: false })
    setProducts((data || []) as Product[])
  }

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => {
      setSession(data.session)
      if (data.session) load()
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) load()
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const login = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('No se pudo iniciar sesión.')
  }

  const saveProduct = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    const form = new FormData(e.currentTarget)
    const payload = {
      name: String(form.get('name') || ''),
      category: String(form.get('category') || ''),
      model: String(form.get('model') || ''),
      price: Number(form.get('price') || 0),
      description: String(form.get('description') || ''),
      stock: Number(form.get('stock') || 0),
      is_new: form.get('is_new') === 'on',
      is_featured: form.get('is_featured') === 'on',
      is_published: form.get('is_published') === 'on',
    }

    let productId = editing?.id
    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id)
      if (error) alert(error.message)
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select('id').single()
      if (error) alert(error.message)
      else productId = data.id
    }

    const file = form.get('photo') as File
    if (productId && file && file.size > 0) {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${productId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file)
      if (uploadError) {
        alert(uploadError.message)
      } else {
        const { data: publicUrl } = supabase.storage.from('product-images').getPublicUrl(path)
        if (editing) {
          const existing = editing.product_images?.[0]
          if (existing) await supabase.from('product_images').update({ is_cover: false }).eq('id', existing.id)
        }
        await supabase.from('product_images').insert({
          product_id: productId,
          image_url: publicUrl.publicUrl,
          position: 0,
          is_cover: true,
        })
      }
    }

    setEditing(null)
    setBusy(false)
    await load()
    e.currentTarget.reset()
  }

  const toggleStock = async (p: Product) => {
    await supabase.from('products').update({ stock: (p.stock || 0) > 0 ? 0 : 1 }).eq('id', p.id)
    load()
  }

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/admin')
  }

  if (!session) {
    return (
      <main className="admin-login">
        <div className="login-card">
          <BrandMark />
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h1>ENTRAR AL VESTUARIO</h1>
          <form onSubmit={login}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
            {error && <p className="error">{error}</p>}
            <button className="admin-primary">INGRESAR</button>
          </form>
          <a href="/">← Volver al sitio</a>
        </div>
      </main>
    )
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <BrandMark compact />
        <div><a href="/" target="_blank" rel="noreferrer">Ver sitio</a><button onClick={logout}><LogOut size={17}/> Salir</button></div>
      </header>
      <section className="admin-content">
        <div className="admin-title"><div><p className="eyebrow">PANEL PRIVADO</p><h1>PRODUCTOS</h1></div></div>
        <div className="admin-grid">
          <form className="product-form" onSubmit={saveProduct} key={editing?.id || 'new'}>
            <h2>{editing ? 'Editar convocado' : 'Nuevo convocado'}</h2>
            <input name="name" placeholder="Nombre" defaultValue={editing?.name || ''} required />
            <div className="form-row">
              <input name="category" placeholder="Categoría (Mates, Bombillas...)" defaultValue={editing?.category || ''} required />
              <input name="model" placeholder="Modelo / tipo" defaultValue={editing?.model || ''} />
            </div>
            <div className="form-row">
              <input name="price" type="number" min="0" placeholder="Precio" defaultValue={editing?.price || ''} required />
              <input name="stock" type="number" min="0" placeholder="Stock" defaultValue={editing?.stock ?? 1} required />
            </div>
            <textarea name="description" placeholder="Descripción" defaultValue={editing?.description || ''}/>
            <label className="file-label">Foto principal <input name="photo" type="file" accept="image/*"/></label>
            <div className="checks">
              <label><input name="is_new" type="checkbox" defaultChecked={!!editing?.is_new}/> Nuevo</label>
              <label><input name="is_featured" type="checkbox" defaultChecked={!!editing?.is_featured}/> Titular</label>
              <label><input name="is_published" type="checkbox" defaultChecked={editing ? !!editing.is_published : true}/> Publicado</label>
            </div>
            <div className="form-actions">
              {editing && <button type="button" onClick={() => setEditing(null)}>Cancelar</button>}
              <button className="admin-primary" disabled={busy}>{busy ? 'GUARDANDO...' : 'GUARDAR PRODUCTO'}</button>
            </div>
          </form>

          <div className="admin-list">
            {products.map(p => (
              <div className="admin-product" key={p.id}>
                <div className="admin-thumb">
                  {p.product_images?.[0]?.image_url ? <img src={p.product_images[0].image_url} alt=""/> : <span>10</span>}
                </div>
                <div className="admin-product-main">
                  <strong>{p.name}</strong>
                  <small>{p.category} · {money(p.price)}</small>
                </div>
                <span className={`stock-pill ${(p.stock || 0) <= 0 ? 'off' : ''}`}>{stockLabel(p.stock)}</span>
                <button onClick={() => setEditing(p)}>Editar</button>
                <button onClick={() => toggleStock(p)}>{(p.stock || 0) > 0 ? 'Agotar' : 'Reponer 1'}</button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

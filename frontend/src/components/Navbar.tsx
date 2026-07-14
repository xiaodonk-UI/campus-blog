'use client';

/**
 * 校园个人博客系统 - 全局导航栏组件
 * 包含：Logo、首页/发布文章/个人中心导航、全局搜索框、登录/注册入口
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Layout, Menu, Input, Button, Avatar, Dropdown, Space, message, Drawer, theme,
} from 'antd';
import {
  HomeOutlined, EditOutlined, UserOutlined, LoginOutlined,
  SearchOutlined, MenuOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';

const { Header } = Layout;

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const { token: themeToken } = theme.useToken();

  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  /** 执行搜索：跳转首页并携带search参数 */
  const handleSearch = useCallback((value: string) => {
    setSearchLoading(true);
    const trimmed = value.trim();
    if (trimmed) {
      router.push(`/?search=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/');
    }
    setTimeout(() => setSearchLoading(false), 500);
  }, [router]);

  /** 退出登录 */
  const handleLogout = useCallback(() => {
    logout();
    router.push('/');
  }, [logout, router]);

  // 用户下拉菜单
  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
    { key: 'my-articles', icon: <EditOutlined />, label: '我的文章' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ];

  const handleUserMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'profile': router.push('/profile'); break;
      case 'my-articles': router.push('/profile?tab=articles'); break;
      case 'logout': handleLogout(); break;
    }
  };

  return (
    <Header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', background: themeToken.colorBgContainer,
      borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
      position: 'sticky', top: 0, zIndex: 100, height: 56,
    }}>
      {/* ===== 左侧：Logo + 桌面导航 ===== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Logo */}
        <Link href="/" style={{
          fontSize: 18, fontWeight: 700, color: themeToken.colorPrimary,
          textDecoration: 'none', whiteSpace: 'nowrap',
        }}>
          📝 校园博客
        </Link>

        {/* 桌面端导航菜单 */}
        <Menu
          mode="horizontal"
          selectedKeys={[pathname === '/' ? '/' : pathname]}
          style={{ border: 'none', minWidth: 200 }}
          items={[
            { key: '/', icon: <HomeOutlined />, label: <Link href="/">首页</Link> },
            { key: '/article/new', icon: <EditOutlined />, label: <Link href="/article/new">发布文章</Link> },
          ]}
        />
      </div>

      {/* ===== 右侧：搜索框 + 用户操作 ===== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* 搜索框 */}
        <Input.Search
          placeholder="搜索文章..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onSearch={handleSearch}
          loading={searchLoading}
          allowClear
          style={{ width: 220 }}
          size="middle"
        />

        {/* 用户操作区（桌面端）— SSR兼容：mounted前不渲染避免hydration不匹配 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!mounted ? <span style={{ width: 80, display: 'inline-block' }} /> :
           user ? (
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar src={user.avatar_url} icon={<UserOutlined />} size="small" />
                <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.nickname || user.username}
                </span>
              </Space>
            </Dropdown>
          ) : (
            <Space>
              <Link href="/login"><Button type="link" icon={<LoginOutlined />}>登录</Button></Link>
              <Link href="/register"><Button type="primary" size="small">注册</Button></Link>
            </Space>
          )}
        </div>

        {/* 移动端菜单按钮 */}
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={() => setMobileMenuOpen(true)}
          style={{ display: 'none' }}
        />
      </div>

      {/* ===== 移动端侧边抽屉菜单 ===== */}
      <Drawer
        title="校园博客"
        placement="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        styles={{ wrapper: { width: 260 } }}
      >
        <Menu
          mode="vertical"
          selectedKeys={[pathname]}
          style={{ border: 'none' }}
          onClick={() => setMobileMenuOpen(false)}
          items={[
            { key: '/', icon: <HomeOutlined />, label: <Link href="/">首页</Link> },
            { key: '/article/new', icon: <EditOutlined />, label: <Link href="/article/new">发布文章</Link> },
            ...(user
              ? [
                { key: '/profile', icon: <UserOutlined />, label: <Link href="/profile">个人中心</Link> },
                { type: 'divider' as const },
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true, onClick: handleLogout },
              ]
              : [
                { type: 'divider' as const },
                { key: '/login', icon: <LoginOutlined />, label: <Link href="/login">登录</Link> },
                { key: '/register', icon: <UserOutlined />, label: <Link href="/register">注册</Link> },
              ]),
          ]}
        />
      </Drawer>
    </Header>
  );
}

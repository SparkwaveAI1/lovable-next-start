import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Hook to access authentication state and methods.
 * Must be used within an AuthProvider.
 *
 * @returns {Object} Auth state and methods
 * @returns {Session | null} session - Current Supabase session
 * @returns {User | null} user - Current authenticated user
 * @returns {boolean} loading - Whether auth state is being determined
 * @returns {boolean} isAuthenticated - Whether user is logged in
 * @returns {Function} signIn - Sign in with email/password
 * @returns {Function} signOut - Sign out current user
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, signOut } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <div>Please log in</div>;
 *   }
 *
 *   return (
 *     <div>
 *       Welcome, {user?.email}
 *       <button onClick={signOut}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuth() {
  return useAuthContext();
}
